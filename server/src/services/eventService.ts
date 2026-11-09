import { EventEmitter } from 'events';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { prisma } from '../db/prisma';

export interface AuditLogEventData {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
}

export interface NotificationEventData {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
  linkUrl?: string;
}

class EventProcessingService extends EventEmitter {
  private redisClient: IORedis | null = null;
  private auditQueue: Queue | null = null;
  private notificationQueue: Queue | null = null;
  private isRedisAvailable = false;
  private processedEvents = new Set<string>();

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    // Only attempt Redis connection if explicitly enabled or Redis host is set and not development sandbox
    if (process.env.USE_REDIS !== 'true') {
      this.isRedisAvailable = false;
      this.setupInProcessQueue();
      return;
    }

    try {
      this.redisClient = new IORedis({
        host: config.redisHost,
        port: config.redisPort,
        maxRetriesPerRequest: null,
        connectTimeout: 500,
        lazyConnect: true,
      });

      this.redisClient.on('error', (err) => {
        // Suppress unhandled redis connection errors
        this.isRedisAvailable = false;
      });

      await this.redisClient.connect();
      this.isRedisAvailable = true;
      console.log('✅ Redis connected successfully. Initializing BullMQ queues...');

      this.auditQueue = new Queue('audit-logs', { connection: this.redisClient });
      this.notificationQueue = new Queue('notifications', { connection: this.redisClient });

      new Worker(
        'audit-logs',
        async (job: Job<AuditLogEventData>) => {
          await this.processAuditLog(job.data, job.id);
        },
        { connection: this.redisClient }
      );

      new Worker(
        'notifications',
        async (job: Job<NotificationEventData>) => {
          await this.processNotification(job.data, job.id);
        },
        { connection: this.redisClient }
      );
    } catch (err) {
      this.isRedisAvailable = false;
      this.setupInProcessQueue();
    }
  }

  private setupInProcessQueue() {
    console.log(
      'ℹ️ Operating resilient in-process background event queue for FPIS events.'
    );
    this.on('audit-log', async (data: AuditLogEventData, eventId?: string) => {
      await this.processAuditLog(data, eventId);
    });

    this.on('notification', async (data: NotificationEventData, eventId?: string) => {
      await this.processNotification(data, eventId);
    });
  }

  // Idempotent audit logging
  private async processAuditLog(data: AuditLogEventData, eventId?: string): Promise<void> {
    if (eventId && this.processedEvents.has(eventId)) {
      console.log(`[EventService] Skipping duplicate audit event: ${eventId}`);
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          details: data.details || null,
          ipAddress: data.ipAddress || null,
        },
      });

      if (eventId) {
        this.processedEvents.add(eventId);
        // prune if large
        if (this.processedEvents.size > 10000) this.processedEvents.clear();
      }
    } catch (error) {
      console.error('[EventService] Failed to process audit log event:', error);
    }
  }

  // Idempotent notification dispatch
  private async processNotification(data: NotificationEventData, eventId?: string): Promise<void> {
    if (eventId && this.processedEvents.has(eventId)) {
      return;
    }

    try {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          linkUrl: data.linkUrl || null,
          isRead: false,
        },
      });

      if (eventId) {
        this.processedEvents.add(eventId);
      }
    } catch (error) {
      console.error('[EventService] Failed to process notification event:', error);
    }
  }

  public async emitAuditLog(data: AuditLogEventData): Promise<void> {
    const eventId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (this.isRedisAvailable && this.auditQueue) {
      await this.auditQueue.add('log', data, {
        jobId: eventId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } else {
      this.emit('audit-log', data, eventId);
    }
  }

  public async emitNotification(data: NotificationEventData): Promise<void> {
    const eventId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (this.isRedisAvailable && this.notificationQueue) {
      await this.notificationQueue.add('send', data, {
        jobId: eventId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } else {
      this.emit('notification', data, eventId);
    }
  }
}

export const eventService = new EventProcessingService();

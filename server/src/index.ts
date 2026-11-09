import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import activityRoutes from './routes/activityRoutes';
import approvalRoutes from './routes/approvalRoutes';
import scoringRoutes from './routes/scoringRoutes';
import schedulingRoutes from './routes/schedulingRoutes';
import adminRoutes from './routes/adminRoutes';
import reportingRoutes from './routes/reportingRoutes';
import notificationRoutes from './routes/notificationRoutes';

export const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for evidence attachments
app.use('/uploads', express.static(config.uploadDir));

// System Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'Faculty Performance Intelligence System (FPIS)',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/scoring', scoringRoutes);
app.use('/api/v1/scheduling', schedulingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportingRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Centralized Error Handling
app.use(errorHandler);

// If running directly (not in test runner)
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 FPIS Backend API running on http://localhost:${config.port}`);
    console.log(`📡 Health endpoint: http://localhost:${config.port}/api/health`);
    console.log(`📂 Upload directory: ${config.uploadDir}`);
  });
}

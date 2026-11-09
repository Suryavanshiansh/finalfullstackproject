import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLogItem } from '../../types';
import { ShieldCheck, Search, Filter, Eye, Clock, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSearch, setActionSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (actionSearch) params.action = actionSearch;
      if (entityFilter) params.entityType = entityFilter;

      const res = await api.getAuditLogs(params);
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionSearch, entityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Audit Logs & Security
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system event ledger tracking user logins, workflow transitions, and policy adjustments.
          </p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Entity Types</option>
              <option value="ACTIVITY">Activities</option>
              <option value="USER">Users</option>
              <option value="SCORING_POLICY">Scoring Policy</option>
              <option value="SCHEDULE">Schedules</option>
              <option value="DEPARTMENT">Departments</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by action..."
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Querying audit records..." />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-8 h-8" />}
              title="No audit entries"
              description="No security or system records found matching the search criteria."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type & ID</th>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-sans">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-sans font-semibold text-slate-800">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'SYSTEM / AUTOMATION'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <span className="font-semibold text-slate-800">{log.entityType}</span>:{' '}
                      <span className="text-slate-400">{log.entityId.slice(0, 10)}...</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate">
                      {log.details || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                        title="Inspect Record"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Event Inspection"
          description={`Record ID: ${selectedLog.id}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Action:</span>
                <span className="font-bold text-indigo-700 font-mono">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {new Date(selectedLog.createdAt).toISOString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operator:</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName} (${selectedLog.user.email})` : 'System Root'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entity:</span>
                <span className="font-mono text-slate-800">{selectedLog.entityType} #{selectedLog.entityId}</span>
              </div>
            </div>

            <div>
              <span className="block font-semibold text-slate-700 mb-1">Event Payload / Remarks:</span>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {selectedLog.details || 'No payload recorded.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Activity, ActivityCategory } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  Download,
  FileText,
  Clock,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingSpinner } from '../../components/ui/StatCard';
import { Input } from '../../components/ui/Input';

export const ApprovalQueuePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();

  const [queue, setQueue] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'SUBMITTED');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Active Review Modal State
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [approvedValue, setApprovedValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (search) params.search = search;

      const res = await api.getApprovalQueue(params);
      if (res.success) {
        setQueue(res.data || []);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to fetch queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, categoryFilter, search]);

  const handleOpenReview = (act: Activity) => {
    setSelectedActivity(act);
    setApprovedValue(act.quantitativeValue);
    setActionReason('');
    setActionType(null);
  };

  const handleStartReview = async (id: string) => {
    try {
      await api.startReview(id);
      success('Review Commenced', 'Activity marked as UNDER REVIEW.');
      fetchQueue();
      if (selectedActivity && selectedActivity.id === id) {
        setSelectedActivity({ ...selectedActivity, status: 'UNDER_REVIEW' });
      }
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !actionType) return;

    if (actionType === 'REJECT' && (!actionReason || actionReason.trim().length < 5)) {
      toastError('Reason Required', 'Please provide a mandatory rejection reason (min 5 characters).');
      return;
    }

    if (actionType === 'CORRECTION' && (!actionReason || actionReason.trim().length < 5)) {
      toastError('Explanation Required', 'Please provide mandatory instructions for what requires correction.');
      return;
    }

    setIsProcessing(true);
    try {
      if (actionType === 'APPROVE') {
        await api.approveActivity(selectedActivity.id, {
          approvedValue: Number(approvedValue),
          feedback: actionReason.trim() || 'Verified and approved.',
        });
        success('Activity Approved', `Granted ${approvedValue} ${selectedActivity.category.unitLabel} to ${selectedActivity.faculty.firstName}.`);
      } else if (actionType === 'REJECT') {
        await api.rejectActivity(selectedActivity.id, actionReason.trim());
        success('Activity Rejected', 'Rejection feedback sent to faculty.');
      } else if (actionType === 'CORRECTION') {
        await api.requestCorrection(selectedActivity.id, actionReason.trim());
        success('Correction Requested', 'Faculty has been notified to revise this submission.');
      }

      setSelectedActivity(null);
      setActionType(null);
      setActionReason('');
      fetchQueue();
    } catch (err: any) {
      toastError('Action Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Department Approval Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit faculty activities, inspect attached credentials/evidence, and verify institutional credit.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'SUBMITTED', label: 'Pending Review' },
              { id: 'UNDER_REVIEW', label: 'Under Review' },
              { id: 'CORRECTION_REQUESTED', label: 'Corrections Pending' },
              { id: 'ALL', label: 'All Submissions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search faculty or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Fetching review submissions..." />
          ) : queue.length === 0 ? (
            <EmptyState
              icon={<FileCheck2 className="w-8 h-8" />}
              title="No pending submissions"
              description="All submissions matching the current filters have been reviewed and audited."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Activity Title & Category</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Claimed Units</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                          {act.faculty.firstName[0]}
                          {act.faculty.lastName[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            Dr. {act.faculty.firstName} {act.faculty.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {act.faculty.designation} • ID: {act.faculty.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-semibold text-slate-900 block truncate">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        {act.category?.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {act.submissionDate
                        ? new Date(act.submissionDate).toLocaleDateString()
                        : 'Draft'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900">
                        {act.status === 'APPROVED' && act.approvedValue !== null
                          ? act.approvedValue
                          : act.quantitativeValue}
                      </span>{' '}
                      <span className="text-slate-500 text-[11px]">{act.category?.unitLabel}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={act.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {act.evidence && act.evidence.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                          <FileText className="w-3.5 h-3.5" />
                          {act.evidence.length} file{act.evidence.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-rose-500 text-[11px] font-medium">Missing File</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenReview(act)}
                      >
                        Inspect & Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Review Dialog Modal */}
      {selectedActivity && (
        <Modal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          title="Review Faculty Submission"
          description={`Verifying contribution claim submitted by Dr. ${selectedActivity.faculty.firstName} ${selectedActivity.faculty.lastName}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Metadata Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm">{selectedActivity.title}</span>
                <StatusBadge status={selectedActivity.status} />
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedActivity.description}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
                <div>
                  <span className="block text-slate-400">Category</span>
                  <span className="font-semibold text-slate-800">{selectedActivity.category.name}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Claimed Value</span>
                  <span className="font-bold text-slate-900">
                    {selectedActivity.quantitativeValue} {selectedActivity.category.unitLabel}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Category Ceiling</span>
                  <span className="font-semibold text-slate-800">
                    {selectedActivity.category.defaultUpperLimit} {selectedActivity.category.unitLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Documents Preview & Download */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Attached Verification Documents ({selectedActivity.evidence.length})
              </h4>
              {selectedActivity.evidence.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>No supporting documentation uploaded with this submission.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedActivity.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-semibold text-slate-800">{ev.originalName}</p>
                          <span className="text-[10px] text-slate-400">
                            {(ev.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <a
                        href={`/uploads/${ev.fileName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Download / View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons: Choose Decision */}
            {selectedActivity.status === 'SUBMITTED' && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-medium">
                  Would you like to mark this activity as actively under assessment?
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartReview(selectedActivity.id)}
                >
                  Start Assessment
                </Button>
              </div>
            )}

            {!actionType ? (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedActivity(null)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setActionType('REJECT')}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Reject
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setActionType('CORRECTION')}
                  leftIcon={<AlertTriangle className="w-4 h-4" />}
                >
                  Request Correction
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActionType('APPROVE')}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Approve Claim
                </Button>
              </div>
            ) : (
              <form onSubmit={handleExecuteDecision} className="space-y-4 pt-3 border-t border-slate-100">
                <div
                  className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-wider ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : actionType === 'REJECT'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  Confirming Decision: {actionType.replace('_', ' ')}
                </div>

                {actionType === 'APPROVE' && (
                  <Input
                    label={`Verified Credits / Value (${selectedActivity.category.unitLabel}) *`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={approvedValue}
                    onChange={(e) => setApprovedValue(parseFloat(e.target.value) || 0)}
                    required
                    helperText={`Claimed: ${selectedActivity.quantitativeValue} ${selectedActivity.category.unitLabel}`}
                  />
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {actionType === 'APPROVE'
                      ? 'Auditor Notes & Verification Feedback'
                      : actionType === 'REJECT'
                      ? 'Mandatory Rejection Rationale (Required) *'
                      : 'Mandatory Correction Instructions (Required) *'}
                  </label>
                  <textarea
                    rows={3}
                    required={actionType !== 'APPROVE'}
                    placeholder={
                      actionType === 'APPROVE'
                        ? 'e.g. Verified against central attendance records.'
                        : actionType === 'REJECT'
                        ? 'e.g. Activity falls outside permissible academic scope.'
                        : 'e.g. Please attach official attendance sheet with tutor sign-off.'
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActionType(null)}
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant={actionType === 'REJECT' ? 'destructive' : 'primary'}
                    size="sm"
                    isLoading={isProcessing}
                  >
                    Confirm {actionType.replace('_', ' ')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

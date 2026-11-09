import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getUploadUrl } from '../../services/api';
import { Activity } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  FileText,
  Send,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/StatCard';

export const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState('');

  const fetchActivity = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.getActivity(id);
      if (res.success && res.data) {
        setActivity(res.data);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      await api.uploadEvidence(id, file);
      success('Evidence Uploaded', 'Document attached to activity.');
      fetchActivity();
    } catch (err: any) {
      toastError('Upload Failed', err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    try {
      await api.deleteEvidence(evidenceId);
      success('Evidence Removed', 'Attached document deleted.');
      fetchActivity();
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    try {
      await api.submitActivity(id);
      success('Submitted', 'Activity sent to department reviewer.');
      fetchActivity();
    } catch (err: any) {
      toastError('Submission Error', err.message);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !correctionNotes.trim()) {
      toastError('Note Required', 'Please provide notes explaining what was revised.');
      return;
    }

    setIsResubmitting(true);
    try {
      await api.resubmitActivity(id, correctionNotes.trim());
      success('Resubmitted', 'Revisions submitted to reviewer.');
      setResubmitModalOpen(false);
      fetchActivity();
    } catch (err: any) {
      toastError('Resubmit Failed', err.message);
    } finally {
      setIsResubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading activity details..." />;
  }

  if (!activity) {
    return (
      <div className="py-12 text-center text-slate-500">
        <p>Activity record not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === activity.facultyId;
  const isDraft = activity.status === 'DRAFT';
  const isCorrectionRequested = activity.status === 'CORRECTION_REQUESTED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/faculty/activities')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Activities
        </button>

        <div className="flex items-center space-x-2">
          {isOwner && isDraft && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitForReview}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit for Approval
            </Button>
          )}

          {isOwner && isCorrectionRequested && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setResubmitModalOpen(true)}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Resubmit Revisions
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {activity.category?.name}
              </span>
              <StatusBadge status={activity.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activity.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Faculty: <span className="font-semibold text-slate-700">{activity.faculty?.firstName} {activity.faculty?.lastName}</span> ({activity.faculty?.designation})
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right shrink-0">
            <span className="text-xs text-slate-400 block font-medium">Claimed / Verified Value</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {activity.status === 'APPROVED' && activity.approvedValue !== null
                ? activity.approvedValue
                : activity.quantitativeValue}{' '}
              <span className="text-xs font-normal text-slate-500">{activity.category?.unitLabel}</span>
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Academic Session</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {activity.academicSession?.name || 'Current Term'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Activity Date</span>
            <span className="font-semibold text-slate-800 mt-0.5 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(activity.date).toLocaleDateString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Submitted On</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {activity.submissionDate ? new Date(activity.submissionDate).toLocaleDateString() : 'Not submitted'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Reviewer</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {activity.reviewer ? `Dr. ${activity.reviewer.firstName} ${activity.reviewer.lastName}` : 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Reviewer Feedback Callout */}
      {activity.reviewerFeedback && (
        <div
          className={`p-5 rounded-2xl border flex items-start space-x-3.5 ${
            activity.status === 'CORRECTION_REQUESTED'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : activity.status === 'REJECTED'
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sm">Reviewer Remarks</h4>
            <p className="mt-1 leading-relaxed opacity-95">{activity.reviewerFeedback}</p>
            {activity.correctionNotes && (
              <div className="mt-2 pt-2 border-t border-amber-200 text-[11px]">
                <span className="font-semibold">Faculty Revision Notes:</span> {activity.correctionNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scope Description */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Scope & Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
            {activity.description}
          </p>
        </CardContent>
      </Card>

      {/* Supporting Evidence Attachments */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Supporting Evidence & Certificates</CardTitle>
            <span className="text-xs text-slate-400">
              Official certificates, attendance registers, or evaluation sign-offs
            </span>
          </div>

          {/* Upload Button */}
          {isOwner && ['DRAFT', 'CORRECTION_REQUESTED'].includes(activity.status) && (
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer border border-indigo-200">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Attach Evidence'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          )}
        </CardHeader>

        <CardContent>
          {activity.evidence.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No evidence files attached to this activity.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {activity.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{ev.originalName}</p>
                      <span className="text-[10px] text-slate-400">
                        {(ev.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(ev.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={getUploadUrl(ev.fileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                      title="View / Download Document"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {isOwner && ['DRAFT', 'CORRECTION_REQUESTED'].includes(activity.status) && (
                      <button
                        onClick={() => handleDeleteEvidence(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Records Timeline */}
      {activity.approvalRecords && activity.approvalRecords.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-500" />
              <CardTitle>Workflow & Approval History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activity.approvalRecords.map((rec) => (
                <div key={rec.id} className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900 uppercase tracking-tight">
                      {rec.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rec.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {rec.comment || 'Status transition recorded.'}
                  </p>
                  {rec.reviewer && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Recorded by: {rec.reviewer.firstName} {rec.reviewer.lastName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resubmit Modal */}
      <Modal
        isOpen={resubmitModalOpen}
        onClose={() => setResubmitModalOpen(false)}
        title="Resubmit Corrected Activity"
        description="Detail the revisions made in response to reviewer comments."
      >
        <form onSubmit={handleResubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Correction Notes / Response to Reviewer *
            </label>
            <textarea
              rows={4}
              required
              placeholder="e.g. Attached the verified student attendance register with tutor signature..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isResubmitting}>
              Resubmit for Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

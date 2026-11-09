import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Activity, ActivityCategory, ActivityStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Send,
  FileCheck2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmationModal, Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingSpinner } from '../../components/ui/StatCard';

export const ActivitiesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('status') || 'ALL');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(searchParams.get('action') === 'new');
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formValue, setFormValue] = useState<number>(1);
  const [formFile, setFormFile] = useState<File | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) {
        setCategories(res.data);
        if (res.data.length > 0 && !formCategory) {
          setFormCategory(res.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (selectedCategory) {
        params.categoryId = selectedCategory;
      }
      if (search) {
        params.search = search;
      }

      const res = await api.getActivities(params);
      if (res.success) {
        setActivities(res.data || []);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [activeTab, selectedCategory, search]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCategory || formValue <= 0) {
      toastError('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activityToEdit) {
        // Update existing activity
        await api.updateActivity(activityToEdit.id, {
          categoryId: formCategory,
          title: formTitle,
          description: formDescription,
          date: formDate,
          quantitativeValue: Number(formValue),
        });
        success('Activity Updated', 'Changes have been saved successfully.');
        setActivityToEdit(null);
      } else {
        // Create new activity
        const newActRes = await api.createActivity({
          categoryId: formCategory,
          title: formTitle,
          description: formDescription,
          date: formDate,
          quantitativeValue: Number(formValue),
        });

        // If evidence file was selected, upload it immediately
        if (formFile && newActRes.data?.id) {
          await api.uploadEvidence(newActRes.data.id, formFile);
        }

        success('Activity Created', 'New activity saved as DRAFT.');
        setIsNewModalOpen(false);
      }

      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormFile(null);
      setFormValue(1);
      fetchActivities();
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to save activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (act: Activity) => {
    setActivityToEdit(act);
    setFormCategory(act.categoryId);
    setFormTitle(act.title);
    setFormDescription(act.description);
    setFormDate(new Date(act.date).toISOString().split('T')[0]);
    setFormValue(act.quantitativeValue);
  };

  const handleSubmitForApproval = async (id: string, title: string) => {
    try {
      await api.submitActivity(id);
      success('Submitted for Review', `"${title}" has been submitted to your department head.`);
      fetchActivities();
    } catch (err: any) {
      toastError('Submission Failed', err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteActivity(activityToDelete.id);
      success('Activity Deleted', 'The activity was deleted successfully.');
      setActivityToDelete(null);
      fetchActivities();
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === formCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Activities</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Document, upload evidence, and track verification for academic workloads and institutional contributions.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setActivityToEdit(null);
            setFormTitle('');
            setFormDescription('');
            setFormValue(1);
            setFormFile(null);
            setIsNewModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Activity Submission
        </Button>
      </div>

      {/* Tabs and Filters */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'SUBMITTED', label: 'Submitted' },
              { id: 'UNDER_REVIEW', label: 'Under Review' },
              { id: 'CORRECTION_REQUESTED', label: 'Needs Correction' },
              { id: 'APPROVED', label: 'Approved' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Category Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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

        {/* Activities Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Loading activities..." />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={<FileCheck2 className="w-8 h-8" />}
              title="No activities found"
              description="You have no recorded activities matching the selected filters. Click below to document a new activity."
              actionText="Create Activity"
              onAction={() => setIsNewModalOpen(true)}
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Activity Title & Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Units / Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act) => {
                  const canEdit = ['DRAFT', 'CORRECTION_REQUESTED'].includes(act.status);
                  const canDelete = ['DRAFT', 'REJECTED'].includes(act.status);
                  const canSubmit = act.status === 'DRAFT';

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <span className="font-semibold text-slate-900 block truncate group-hover:text-indigo-600 transition">
                          {act.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {act.category?.name}
                          </span>
                          {act.reviewerFeedback && (
                            <span className="text-[10px] text-amber-600 truncate max-w-[200px]">
                              Note: {act.reviewerFeedback}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(act.date).toLocaleDateString()}
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

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {act.evidence && act.evidence.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                            <FileText className="w-3.5 h-3.5" />
                            {act.evidence.length} file{act.evidence.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/faculty/activities/${act.id}`)}
                            title="View Activity Details"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>

                          {canSubmit && (
                            <Button
                              variant="subtle"
                              size="sm"
                              onClick={() => handleSubmitForApproval(act.id, act.title)}
                              title="Submit for Approval"
                              leftIcon={<Send className="w-3.5 h-3.5" />}
                            >
                              Submit
                            </Button>
                          )}

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(act)}
                              title="Edit Activity"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setActivityToDelete(act)}
                              title="Delete Activity"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create / Edit Activity Modal */}
      <Modal
        isOpen={isNewModalOpen || !!activityToEdit}
        onClose={() => {
          setIsNewModalOpen(false);
          setActivityToEdit(null);
        }}
        title={activityToEdit ? 'Edit Faculty Activity' : 'Document New Activity'}
        description="Provide comprehensive details and quantitative evidence for explainable contribution scoring."
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <Select
            label="Activity Category *"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Upper Limit: {c.defaultUpperLimit} {c.unitLabel}, Weight: {(c.defaultWeight * 100).toFixed(0)}%)
              </option>
            ))}
          </Select>

          <Input
            label="Activity Title *"
            placeholder="e.g. Distributed Systems Lab Instruction, AICTE Workshop"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Quantitative Value (${selectedCategoryObj?.unitLabel || 'Units'}) *`}
              type="number"
              step="0.1"
              min="0.1"
              value={formValue}
              onChange={(e) => setFormValue(parseFloat(e.target.value) || 0)}
              required
              helperText={`Upper limit benchmark: ${selectedCategoryObj?.defaultUpperLimit || 100} ${selectedCategoryObj?.unitLabel || 'units'}`}
            />

            <Input
              label="Activity Date *"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Detailed Description & Objectives *
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              placeholder="Outline the scope, participant count, syllabi covered, or institutional outcome..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              required
            />
          </div>

          {!activityToEdit && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Supporting Evidence Document (Optional)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Accepted formats: PDF, PNG, JPG, DOCX (Max 10MB)
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsNewModalOpen(false);
                setActivityToEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {activityToEdit ? 'Save Changes' : 'Save as Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!activityToDelete}
        onClose={() => setActivityToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Activity Submission"
        message={`Are you sure you want to delete "${activityToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Activity"
        isLoading={isDeleting}
      />
    </div>
  );
};

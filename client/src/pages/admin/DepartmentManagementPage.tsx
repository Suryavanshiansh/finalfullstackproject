import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Department, User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Building2, Plus, Edit2, Users, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';

export const DepartmentManagementPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hodId, setHodId] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, userRes] = await Promise.all([
        api.getDepartments(),
        api.getUsers({ role: 'REVIEWER' }),
      ]);

      if (deptRes.success) setDepartments(deptRes.data);
      if (userRes.success) setReviewers(userRes.data);
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createDepartment({ code, name, description });
      success('Department Created', `Added ${name} (${code})`);
      setIsCreateOpen(false);
      setCode('');
      setName('');
      setDescription('');
      fetchData();
    } catch (err: any) {
      toastError('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptToEdit) return;
    setIsSubmitting(true);
    try {
      await api.updateDepartment(deptToEdit.id, {
        name,
        description,
        hodId: hodId || null,
      });
      success('Department Updated', 'Department details updated.');
      setDeptToEdit(null);
      fetchData();
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (d: Department) => {
    setDeptToEdit(d);
    setName(d.name);
    setDescription(d.description || '');
    setHodId(d.hodId || '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Academic Departments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional faculties, academic councils, and Head of Department appointments.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setCode('');
            setName('');
            setDescription('');
            setIsCreateOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Department
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments Registry</CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Loading departments..." />
          ) : departments.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-8 h-8" />}
              title="No departments found"
              description="Define departments to organize faculty members."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Faculty Count</th>
                  <th className="py-3 px-4 text-center">Courses Offered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {d.code}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {d.name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {d.description || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3 text-slate-400" />
                        {d._count?.users ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        {d._count?.courses ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Academic Department"
        description="Register a new academic department or school."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Department Code *"
            placeholder="e.g. MECH, CIVIL, AI"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <Input
            label="Department Name *"
            placeholder="e.g. Department of Mechanical Engineering"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Textarea
            label="Description"
            placeholder="Brief scope of the department..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {deptToEdit && (
        <Modal
          isOpen={!!deptToEdit}
          onClose={() => setDeptToEdit(null)}
          title={`Edit Department: ${deptToEdit.code}`}
          description="Update department details and appoint Head of Department."
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Department Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Select
              label="Head of Department (Reviewer)"
              value={hodId}
              onChange={(e) => setHodId(e.target.value)}
            >
              <option value="">No HOD Assigned</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  Dr. {r.firstName} {r.lastName} ({r.employeeId})
                </option>
              ))}
            </Select>

            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeptToEdit(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

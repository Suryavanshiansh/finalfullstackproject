import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { User, Department, UserRole } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  KeyRound,
  Shield,
  Building,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';

export const UserManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('action') === 'create');
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('FACULTY');
  const [formDesignation, setFormDesignation] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');

  const fetchDepartments = async () => {
    try {
      const res = await api.getDepartments();
      if (res.success) setDepartments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (roleFilter) params.role = roleFilter;
      if (deptFilter) params.departmentId = deptFilter;
      if (search) params.search = search;

      const res = await api.getUsers(params);
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, deptFilter, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createUser({
        email: formEmail,
        firstName: formFirstName,
        lastName: formLastName,
        employeeId: formEmployeeId,
        role: formRole,
        designation: formDesignation,
        departmentId: formDeptId || undefined,
        phone: formPhone || undefined,
        passwordPlain: 'Password@123',
      });
      success('User Created', `Added ${formFirstName} ${formLastName} with default password Password@123`);
      setIsCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      toastError('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setIsSubmitting(true);
    try {
      await api.updateUser(userToEdit.id, {
        firstName: formFirstName,
        lastName: formLastName,
        designation: formDesignation,
        departmentId: formDeptId || null,
        role: formRole,
        status: formStatus,
        phone: formPhone,
      });
      success('User Updated', 'User profile changes saved successfully.');
      setUserToEdit(null);
      fetchUsers();
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset || newPassword.length < 6) {
      toastError('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetPassword(userToReset.id, newPassword);
      success('Password Reset', `Password updated for ${userToReset.firstName} ${userToReset.lastName}.`);
      setUserToReset(null);
      setNewPassword('');
    } catch (err: any) {
      toastError('Reset Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormEmployeeId('');
    setFormRole('FACULTY');
    setFormDesignation('');
    setFormDeptId('');
    setFormPhone('');
    setFormStatus('ACTIVE');
  };

  const openEditModal = (u: User) => {
    setUserToEdit(u);
    setFormFirstName(u.firstName);
    setFormLastName(u.lastName);
    setFormDesignation(u.designation);
    setFormDeptId(u.departmentId || '');
    setFormRole(u.role);
    setFormPhone(u.phone || '');
    setFormStatus(u.status || 'ACTIVE');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            User Directory & Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional identities, faculty appointments, roles, and credential administration.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New User
        </Button>
      </div>

      {/* Filters & Search */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="FACULTY">Faculty</option>
              <option value="REVIEWER">Reviewer / HOD</option>
              <option value="ADMIN">Administrator</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Loading user accounts..." />
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="No users found"
              description="No user accounts match the selected filters."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {u.firstName[0]}
                          {u.lastName[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {u.firstName} {u.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {u.designation} • {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {u.employeeId}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          u.role === 'ADMIN'
                            ? 'destructive'
                            : u.role === 'REVIEWER'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {u.department ? u.department.name : 'University Administration'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          u.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(u)}
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUserToReset(u);
                            setNewPassword('');
                          }}
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4 text-amber-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New User Account"
        description="Provision a faculty, reviewer, or administrator profile."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              required
              value={formFirstName}
              onChange={(e) => setFormFirstName(e.target.value)}
            />
            <Input
              label="Last Name *"
              required
              value={formLastName}
              onChange={(e) => setFormLastName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institutional Email *"
              type="email"
              required
              placeholder="faculty@fpis.edu"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <Input
              label="Employee ID *"
              required
              placeholder="EMP-FAC-301"
              value={formEmployeeId}
              onChange={(e) => setFormEmployeeId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="System Role *"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
            >
              <option value="FACULTY">Faculty Member</option>
              <option value="REVIEWER">Department Reviewer / HOD</option>
              <option value="ADMIN">System Administrator</option>
            </Select>

            <Input
              label="Academic Designation *"
              required
              placeholder="e.g. Associate Professor"
              value={formDesignation}
              onChange={(e) => setFormDesignation(e.target.value)}
            />
          </div>

          <Select
            label="Assigned Department"
            value={formDeptId}
            onChange={(e) => setFormDeptId(e.target.value)}
          >
            <option value="">No Department (Central Administration)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>

          <Input
            label="Contact Phone"
            placeholder="+1 (555) 000-0000"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {userToEdit && (
        <Modal
          isOpen={!!userToEdit}
          onClose={() => setUserToEdit(null)}
          title={`Edit Profile: ${userToEdit.firstName} ${userToEdit.lastName}`}
          description="Update role privileges, designation, and status."
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name *"
                required
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
              />
              <Input
                label="Last Name *"
                required
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Academic Designation *"
                required
                value={formDesignation}
                onChange={(e) => setFormDesignation(e.target.value)}
              />
              <Select
                label="Assigned Role *"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
              >
                <option value="FACULTY">Faculty</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </div>

            <Select
              label="Assigned Department"
              value={formDeptId}
              onChange={(e) => setFormDeptId(e.target.value)}
            >
              <option value="">No Department (Central)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>

            <Select
              label="Account Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE (Authorized)</option>
              <option value="INACTIVE">INACTIVE (Access Blocked)</option>
            </Select>

            <Input
              label="Phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUserToEdit(null)}
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

      {/* Reset Password Modal */}
      {userToReset && (
        <Modal
          isOpen={!!userToReset}
          onClose={() => setUserToReset(null)}
          title={`Reset Password for ${userToReset.firstName} ${userToReset.lastName}`}
          description={`Employee ID: ${userToReset.employeeId} • Email: ${userToReset.email}`}
          maxWidth="sm"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="New Account Password *"
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="The password will be securely hashed with bcrypt."
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUserToReset(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Reset Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

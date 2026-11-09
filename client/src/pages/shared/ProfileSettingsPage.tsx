import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { User, Lock, Save, ShieldCheck, Mail, Building, Phone, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const ProfileSettingsPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();

  // Profile Form State
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await api.updateProfile({ phone, bio });
      success('Profile Saved', 'Your contact and biographical information has been updated.');
      await refreshProfile();
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toastError('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('Mismatch', 'New password and confirmation password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      success('Password Changed', 'Your account credentials have been securely updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError('Password Change Failed', err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Account Profile & Security Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your contact information, credentials, and institutional authentication settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="md:col-span-1 p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            {user?.firstName?.[0] || 'U'}
            {user?.lastName?.[0] || ''}
          </div>

          <div>
            <h3 className="font-bold text-base text-slate-900">
              Dr. {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.designation}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {user?.role}
            </span>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 text-xs text-left space-y-2.5">
            <div className="flex items-center text-slate-600 gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center text-slate-600 gap-2">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{user?.department?.name || 'Central Administration'}</span>
            </div>
            <div className="flex items-center text-slate-600 gap-2">
              <Award className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono">{user?.employeeId}</span>
            </div>
          </div>
        </Card>

        {/* Edit Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact & Bio */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Biographical Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <Input
                  label="Contact Phone"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <Textarea
                  label="Academic Bio & Research Focus"
                  placeholder="Summarize your teaching areas, research interests, or laboratory specialization..."
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isUpdatingProfile}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <CardTitle>Update Account Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  label="Current Password *"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="New Password *"
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <Input
                    label="Confirm New Password *"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    isLoading={isChangingPassword}
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

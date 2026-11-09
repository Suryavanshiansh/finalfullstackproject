import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const homeRoute =
    role === 'ADMIN'
      ? '/admin/dashboard'
      : role === 'REVIEWER'
      ? '/reviewer/dashboard'
      : '/faculty/dashboard';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
        Your current role (<span className="font-semibold text-slate-700">{role}</span>) does not have authorization to view this resource. Department isolation and role privileges are strictly enforced.
      </p>

      <div className="mt-6 flex items-center space-x-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
        <Button variant="primary" size="sm" onClick={() => navigate(homeRoute)} leftIcon={<Home className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

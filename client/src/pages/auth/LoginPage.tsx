import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Award, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setIsLoading(true);
    setErrorMessage('');
    try {
      await login(demoEmail, 'Password@123');
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white mb-4">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Faculty Performance Intelligence
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Academic Activity Tracking, Workload, Transparent Scoring & Timetabling
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white text-slate-900 py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-200/80">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="font-semibold shrink-0">Error:</span> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Institutional Email"
                type="email"
                placeholder="name@fpis.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Input
                label="Account Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Credentials Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Institutional Demo Logins
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoFill('faculty.cs@fpis.edu')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Dr. Sarah Jenkins
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Faculty Role • Associate Professor (CSE)
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition">
                  Faculty
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('reviewer.cs@fpis.edu')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Dr. Robert Chen
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Reviewer Role • Professor & Head of Department
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition">
                  Reviewer / HOD
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('admin@fpis.edu')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Dr. Eleanor Vance
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Admin Role • Dean of Academic Affairs
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition">
                  Administrator
                </span>
              </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-400 text-center">
              All accounts pre-seeded with password: <code className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded">Password@123</code>
            </p>
          </div>
        </div>

        {/* Footer security note */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Role-based access control with transparent audit trails</span>
        </div>
      </div>
    </div>
  );
};

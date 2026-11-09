import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  FileCheck2,
  Award,
  CalendarCheck2,
  Calendar,
  Users,
  BookOpen,
  Building2,
  Sliders,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  DoorOpen,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { user, role, quickSwitchRole } = useAuth();

  const facultyNav = [
    { label: 'Overview', to: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'My Activities', to: '/faculty/activities', icon: FileCheck2 },
    { label: 'Contribution Score', to: '/faculty/score', icon: Award },
    { label: 'My Timetable', to: '/faculty/timetable', icon: Calendar },
    { label: 'Availability', to: '/faculty/availability', icon: CalendarCheck2 },
  ];

  const reviewerNav = [
    { label: 'Reviewer Dashboard', to: '/reviewer/dashboard', icon: LayoutDashboard },
    { label: 'Approval Queue', to: '/reviewer/queue', icon: FileCheck2 },
    { label: 'Department Faculty', to: '/reviewer/faculty', icon: Users },
    { label: 'Department Timetable', to: '/scheduler', icon: Calendar },
  ];

  const adminNav = [
    { label: 'Admin Console', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Directory', to: '/admin/users', icon: Users },
    { label: 'Departments', to: '/admin/departments', icon: Building2 },
    { label: 'Courses & Expertise', to: '/admin/courses', icon: BookOpen },
    { label: 'Classrooms', to: '/admin/classrooms', icon: DoorOpen },
    { label: 'Scoring Policies', to: '/admin/scoring-policy', icon: Sliders },
    { label: 'Smart Scheduler', to: '/scheduler', icon: Clock },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: ShieldCheck },
  ];

  const sharedNav = [
    { label: 'Institutional Reports', to: '/reports', icon: FileSpreadsheet },
    { label: 'Account Profile', to: '/profile', icon: Settings },
  ];

  const activeNavs = role === 'ADMIN' ? adminNav : role === 'REVIEWER' ? reviewerNav : facultyNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-900/40">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">FPIS Enterprise</span>
            <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider block">
              Faculty Intelligence
            </span>
          </div>
        </div>

        {/* User Role Card */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-white">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    role === 'ADMIN'
                      ? 'bg-rose-400'
                      : role === 'REVIEWER'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[10px] text-slate-400 font-medium">
                  {role === 'ADMIN' ? 'Administrator' : role === 'REVIEWER' ? 'Reviewer / HOD' : 'Faculty'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Core Modules
            </p>
            <nav className="space-y-1">
              {activeNavs.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Analytics & Preferences
            </p>
            <nav className="space-y-1">
              {sharedNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Quick Role Switcher for instant verification */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Demo Role Switcher
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(['FACULTY', 'REVIEWER', 'ADMIN'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => quickSwitchRole(r)}
                className={`text-[10px] py-1 px-1.5 rounded font-medium transition cursor-pointer text-center ${
                  role === r
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {r === 'FACULTY' ? 'Faculty' : r === 'REVIEWER' ? 'Reviewer' : 'Admin'}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

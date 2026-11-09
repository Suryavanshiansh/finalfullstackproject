import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Users,
  Building2,
  BookOpen,
  DoorOpen,
  Sliders,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard, LoadingSpinner } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await api.getAdminStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Loading system administration console..." />;
  }

  const modules = [
    {
      title: 'User & Faculty Directory',
      description: 'Manage faculty profiles, department heads, system administrators, and role assignments.',
      icon: Users,
      to: '/admin/users',
      count: `${stats?.totalUsers ?? 0} Accounts`,
    },
    {
      title: 'Academic Departments',
      description: 'Define departments, appoint HOD reviewers, and configure academic councils.',
      icon: Building2,
      to: '/admin/departments',
      count: `${stats?.totalDepartments ?? 0} Departments`,
    },
    {
      title: 'Courses & Faculty Expertise',
      description: 'Curriculum catalog, course credits, and primary/secondary faculty qualifications.',
      icon: BookOpen,
      to: '/admin/courses',
      count: `${stats?.totalCourses ?? 0} Courses`,
    },
    {
      title: 'Classrooms & Laboratories',
      description: 'Venue capacities, lecture halls, computer labs, and facility availability status.',
      icon: DoorOpen,
      to: '/admin/classrooms',
      count: `${stats?.totalClassrooms ?? 0} Venues`,
    },
    {
      title: 'Scoring & Quality Policies',
      description: 'Configure institutional weights (summing to 1.0) and category ceilings for accreditation.',
      icon: Sliders,
      to: '/admin/scoring-policy',
      count: 'Active v1.0',
    },
    {
      title: 'Smart Scheduling System',
      description: 'Constraint satisfaction timetabling engine with conflict detection and automated solver.',
      icon: Clock,
      to: '/scheduler',
      count: 'Ready to Solve',
    },
    {
      title: 'Audit Logs & Governance',
      description: 'Comprehensive, immutable system event log tracking logins, updates, and approvals.',
      icon: ShieldCheck,
      to: '/admin/audit-logs',
      count: 'Full Trail',
    },
    {
      title: 'Institutional Analytics',
      description: 'University-wide faculty performance reports, department comparisons, and CSV export.',
      icon: FileCheck2,
      to: '/reports',
      count: 'Live Reports',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              Institution Administration Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Academic Term: {stats?.activeSession?.name || 'Fall 2025-2026'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Academic Performance Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized policy configuration, user role management, course catalogs, and compliance reporting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => navigate('/admin/users?action=create')}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Create User Account
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/scoring-policy')}
            leftIcon={<Sliders className="w-4 h-4" />}
          >
            Edit Scoring Policy
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Faculty Staff"
          value={stats?.totalFaculty ?? 0}
          subtitle="Registered professors & lecturers"
          color="indigo"
          icon={<Users className="w-5 h-5" />}
          onClick={() => navigate('/admin/users?role=FACULTY')}
        />

        <StatCard
          title="Active Departments"
          value={stats?.totalDepartments ?? 0}
          subtitle="Engineering & sciences councils"
          color="purple"
          icon={<Building2 className="w-5 h-5" />}
          onClick={() => navigate('/admin/departments')}
        />

        <StatCard
          title="Curriculum Courses"
          value={stats?.totalCourses ?? 0}
          subtitle="Undergraduate & graduate catalog"
          color="emerald"
          icon={<BookOpen className="w-5 h-5" />}
          onClick={() => navigate('/admin/courses')}
        />

        <StatCard
          title="Submissions Recorded"
          value={stats?.totalActivities ?? 0}
          subtitle={`${stats?.pendingActivities ?? 0} pending department review`}
          color="amber"
          icon={<FileCheck2 className="w-5 h-5" />}
          onClick={() => navigate('/reviewer/queue')}
        />
      </div>

      {/* Management Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <Card
            key={m.to}
            onClick={() => navigate(m.to)}
            className="p-5 flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <m.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {m.count}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                {m.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {m.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Manage Module</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

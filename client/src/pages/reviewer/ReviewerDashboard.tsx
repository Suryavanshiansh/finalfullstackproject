import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileCheck2,
  Users,
  Clock,
  AlertTriangle,
  Award,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { StatCard, LoadingSpinner } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ReviewerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [deptScores, setDeptScores] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, scoresRes] = await Promise.all([
          api.getReviewerStats(),
          user?.departmentId ? api.getDepartmentScores(user.departmentId) : Promise.resolve({ data: null }),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (scoresRes.data) setDeptScores(scoresRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.departmentId]);

  if (isLoading) {
    return <LoadingSpinner text="Loading department review metrics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Department Head / Reviewer Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {user?.department?.name || 'Computer Science & Engineering'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reviewer Dashboard: Dr. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department Activity Validation, Workload Balance & Contribution Verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => navigate('/reviewer/queue')}
            leftIcon={<FileCheck2 className="w-4 h-4" />}
          >
            Review Approval Queue ({stats?.pendingApprovals ?? 0})
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/scheduler')}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Timetabling
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingApprovals ?? 0}
          subtitle="Submissions requiring your decision"
          color="amber"
          icon={<Clock className="w-5 h-5" />}
          onClick={() => navigate('/reviewer/queue?status=SUBMITTED')}
        />

        <StatCard
          title="Under Active Review"
          value={stats?.underReview ?? 0}
          subtitle="In-progress evaluations"
          color="indigo"
          icon={<FileCheck2 className="w-5 h-5" />}
          onClick={() => navigate('/reviewer/queue?status=UNDER_REVIEW')}
        />

        <StatCard
          title="Department Average OCI"
          value={`${deptScores?.averageScore ?? 0} / 100`}
          subtitle="Average contribution index"
          color="emerald"
          icon={<Award className="w-5 h-5" />}
          onClick={() => navigate('/reviewer/faculty')}
        />

        <StatCard
          title="Department Faculty"
          value={stats?.facultyCount ?? 0}
          subtitle="Full-time academic staff"
          color="purple"
          icon={<Users className="w-5 h-5" />}
          onClick={() => navigate('/reviewer/faculty')}
        />
      </div>

      {/* Faculty Activity Summary Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Department Faculty Submissions & Status</CardTitle>
            <span className="text-xs text-slate-400">
              Overview of teaching staff submissions and pending approvals in {user?.department?.code}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reviewer/faculty')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All Faculty Records
          </Button>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Faculty Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4 text-center">Approved Activities</th>
                <th className="py-3 px-4 text-center">Pending Approvals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.facultySummary?.map((f: any) => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {f.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {f.designation}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {f.employeeId}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                      {f.totalApproved}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                        f.totalPending > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {f.totalPending}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/reviewer/queue?search=${f.name}`)}
                    >
                      View Queue
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

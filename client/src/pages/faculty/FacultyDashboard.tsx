import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FacultyScoreReport, ScheduleEntry } from '../../types';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  PlusCircle,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { StatCard, ProgressBar, LoadingSpinner } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [scoreReport, setScoreReport] = useState<FacultyScoreReport | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [metricRes, scoreRes, timetableRes] = await Promise.all([
          api.getFacultyMetrics(),
          api.getMyScore(),
          api.getTimetable({ facultyId: user?.id }),
        ]);

        if (metricRes.success) setMetrics(metricRes.data);
        if (scoreRes.success) setScoreReport(scoreRes.data);
        if (timetableRes.success) setUpcomingClasses(timetableRes.data || []);
      } catch (err) {
        console.error('Error loading faculty dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  if (isLoading) {
    return <LoadingSpinner text="Compiling faculty performance intelligence..." />;
  }

  // Workload calculations (16 hours standard weekly cap)
  const maxWeeklyHours = 16.0;
  const currentScheduledHours = upcomingClasses.length;
  const workloadPercent = Math.min(Math.round((currentScheduledHours / maxWeeklyHours) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {user?.department?.name || 'Department of Computer Science'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{user?.designation}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, Dr. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Faculty Performance & Intelligence Portal • Employee ID: <span className="font-mono font-medium text-slate-700">{user?.employeeId}</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/faculty/activities?action=new')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Submit Activity
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/faculty/score')}
            leftIcon={<Award className="w-4 h-4" />}
          >
            Score Breakdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/faculty/timetable')}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Timetable
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Contribution Index"
          value={`${scoreReport?.overallContributionIndex || 0} / 100`}
          subtitle={scoreReport?.tierLabel || 'Transparent weighted evaluation'}
          color="indigo"
          icon={<Award className="w-5 h-5" />}
          onClick={() => navigate('/faculty/score')}
        />

        <StatCard
          title="Approved Activities"
          value={metrics?.approvedCount ?? 0}
          subtitle={`${metrics?.teachingHoursApproved ?? 0} verified teaching hours`}
          color="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
          onClick={() => navigate('/faculty/activities?status=APPROVED')}
        />

        <StatCard
          title="Pending Approvals"
          value={metrics?.pendingCount ?? 0}
          subtitle="Awaiting department head review"
          color="amber"
          icon={<Clock className="w-5 h-5" />}
          onClick={() => navigate('/faculty/activities?status=SUBMITTED')}
        />

        <StatCard
          title="Corrections Requested"
          value={metrics?.correctionCount ?? 0}
          subtitle={metrics?.correctionCount > 0 ? 'Requires your attention' : 'No revisions required'}
          color={metrics?.correctionCount > 0 ? 'rose' : 'sky'}
          icon={<AlertTriangle className="w-5 h-5" />}
          onClick={() => navigate('/faculty/activities?status=CORRECTION_REQUESTED')}
        />
      </div>

      {/* Main Grid: Workload & Score Breakdown Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Card */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle>Teaching Workload Meter</CardTitle>
                <CardDescription>Scheduled lecture and laboratory hours this term</CardDescription>
              </div>
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {currentScheduledHours}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">/ {maxWeeklyHours} hrs weekly</span>
                </div>
                <Badge variant={workloadPercent > 90 ? 'warning' : 'success'}>
                  {workloadPercent}% Allocated
                </Badge>
              </div>

              <ProgressBar
                value={currentScheduledHours}
                max={maxWeeklyHours}
                color={workloadPercent > 90 ? 'amber' : 'indigo'}
              />

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                <p className="flex justify-between">
                  <span>Policy Minimum:</span>
                  <span className="font-semibold text-slate-800">8.0 hrs/week</span>
                </p>
                <p className="flex justify-between">
                  <span>Policy Ceiling:</span>
                  <span className="font-semibold text-slate-800">16.0 hrs/week</span>
                </p>
                <p className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-emerald-600">Compliant with Workload Policy</span>
                </p>
              </div>
            </CardContent>
          </div>

          <CardFooter>
            <span className="text-xs text-slate-400">Manage time preferences</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/faculty/availability')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Set Availability
            </Button>
          </CardFooter>
        </Card>

        {/* Explainable Contribution Radar / Category Summary */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle>Contribution Index Breakdown</CardTitle>
                <CardDescription>
                  Explainable scoring based on policy: <span className="font-semibold text-slate-700">{scoreReport?.policyName}</span>
                </CardDescription>
              </div>
              <Badge variant="purple">{scoreReport?.tier}</Badge>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {scoreReport?.breakdown?.slice(0, 5).map((b) => (
                  <div key={b.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">{b.categoryName}</span>
                        <span className="text-[10px] text-slate-400">
                          ({b.actualContribution} / {b.upperLimit} {b.unitLabel})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500 font-medium">
                          Weight: {(b.weight * 100).toFixed(0)}%
                        </span>
                        <span className="font-bold text-slate-900 w-12 text-right">
                          {b.normalizedScore.toFixed(0)} pts
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={b.normalizedScore}
                      max={100}
                      showPercent={false}
                      color={b.normalizedScore >= 80 ? 'emerald' : b.normalizedScore >= 40 ? 'indigo' : 'amber'}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </div>

          <CardFooter>
            <span className="text-xs text-slate-400">
              Calculation: Sum of (Category Weight × Normalized Score)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/faculty/score')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Full Calculation Details
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Upcoming Classes / Timetable Preview */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Assigned Teaching Schedule Preview</CardTitle>
            <CardDescription>Weekly lecture and laboratory slots in this academic term</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/faculty/timetable')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Full Calendar
          </Button>
        </CardHeader>

        <CardContent>
          {upcomingClasses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No schedule entries assigned yet for this academic term.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {upcomingClasses.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {item.course.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      {item.dayOfWeek}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {item.course.name}
                  </h4>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.timeSlot.startTime} - {item.timeSlot.endTime}
                    </span>
                    <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.classroom.roomNumber}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

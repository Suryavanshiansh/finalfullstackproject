import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Department, AcademicSession } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  Download,
  Printer,
  BarChart2,
  PieChart as PieIcon,
  Filter,
  CheckCircle2,
  Users,
  Building,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [activeReport, setActiveReport] = useState<'FACULTY' | 'DEPARTMENT' | 'PARTICIPATION'>('FACULTY');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchFilters = async () => {
    try {
      const dRes = await api.getDepartments();
      if (dRes.success) setDepartments(dRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      if (activeReport === 'FACULTY') {
        const res = await api.getFacultyReport({
          departmentId: selectedDeptId || undefined,
        });
        if (res.success) setReportData(res.data);
      } else if (activeReport === 'DEPARTMENT') {
        const res = await api.getDepartmentAnalytics();
        if (res.success) setReportData(res.data);
      } else if (activeReport === 'PARTICIPATION') {
        const res = await api.getActivityParticipation();
        if (res.success) setReportData(res.data);
      }
    } catch (err: any) {
      toastError('Report Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, selectedDeptId]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const type =
        activeReport === 'FACULTY' ? 'faculty-contribution' : 'department-analytics';
      await api.exportCSV(type, {
        departmentId: selectedDeptId || undefined,
      });
      success('CSV Export Ready', 'Report file has been saved to your downloads.');
    } catch (err: any) {
      toastError('Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Performance Analytics & Reporting
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade performance metrics, NAAC/NBA compliance statistics, and CSV export.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1">
            {[
              { id: 'FACULTY', label: 'Faculty Contribution Report' },
              { id: 'DEPARTMENT', label: 'Department Analytics' },
              { id: 'PARTICIPATION', label: 'Activity Participation Summary' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id as any)}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeReport === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeReport === 'FACULTY' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Filter Dept:</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Report Content */}
        {isLoading ? (
          <LoadingSpinner text="Generating analytical report..." />
        ) : (
          <div className="p-6 space-y-6">
            {/* 1. Faculty Contribution Report View */}
            {activeReport === 'FACULTY' && reportData && (
              <>
                {/* Interactive Chart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.data.map((f: any) => ({
                        name: f.name.replace('Dr. ', ''),
                        score: f.overallContributionIndex,
                        tier: f.tier,
                      }))}
                      margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [`${val} / 100`, 'OCI Score']} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {reportData.data.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.overallContributionIndex >= 80
                                ? '#10b981'
                                : entry.overallContributionIndex >= 60
                                ? '#6366f1'
                                : '#f59e0b'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Faculty Name</th>
                        <th className="py-3 px-4">Employee ID</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4 text-center">OCI Score (0-100)</th>
                        <th className="py-3 px-4 text-center">Evaluation Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.data.map((row: any) => (
                        <tr key={row.facultyId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900">{row.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{row.employeeId}</td>
                          <td className="py-3 px-4 text-slate-700">{row.department}</td>
                          <td className="py-3 px-4 text-slate-500">{row.designation}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {row.overallContributionIndex.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                row.tier === 'EXEMPLARY'
                                  ? 'success'
                                  : row.tier === 'COMMENDABLE'
                                  ? 'purple'
                                  : 'default'
                              }
                            >
                              {row.tierLabel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 2. Department Analytics Report View */}
            {activeReport === 'DEPARTMENT' && Array.isArray(reportData) && (
              <div className="space-y-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.map((d: any) => ({
                        department: d.code,
                        averageOCI: d.averageOCI,
                        approvalRate: d.approvalRate,
                      }))}
                      margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="averageOCI" name="Average OCI" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="approvalRate" name="Approval Rate %" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Dept Code</th>
                        <th className="py-3 px-4">Department Name</th>
                        <th className="py-3 px-4 text-center">Faculty Count</th>
                        <th className="py-3 px-4 text-center">Average OCI</th>
                        <th className="py-3 px-4 text-center">Activities Submitted</th>
                        <th className="py-3 px-4 text-center">Approved Activities</th>
                        <th className="py-3 px-4 text-center">Turnaround / Approval Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map((dept: any) => (
                        <tr key={dept.departmentId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">{dept.code}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{dept.name}</td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700">{dept.facultyCount}</td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-600">{dept.averageOCI.toFixed(1)}</td>
                          <td className="py-3 px-4 text-center text-slate-700">{dept.activitiesSubmitted}</td>
                          <td className="py-3 px-4 text-center text-emerald-600 font-bold">{dept.activitiesApproved}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {dept.approvalRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Activity Participation Report View */}
            {activeReport === 'PARTICIPATION' && reportData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportData.summary?.map((s: any) => (
                    <div key={s.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                        {s.name}
                      </span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-2xl font-bold text-slate-900">{s.approved}</span>
                        <span className="text-xs text-slate-400">/ {s.total} submitted</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                        {s.units.toFixed(1)} verified units
                      </span>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Faculty Contributor</th>
                        <th className="py-3 px-4">Activity Title</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Claimed Units</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.details?.map((act: any) => (
                        <tr key={act.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-semibold text-indigo-700">{act.category.name}</td>
                          <td className="py-3 px-4 text-slate-900 font-medium">
                            {act.faculty.firstName} {act.faculty.lastName} ({act.faculty.department?.code})
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{act.title}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(act.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {act.quantitativeValue} {act.category.unitLabel}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              act.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {act.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

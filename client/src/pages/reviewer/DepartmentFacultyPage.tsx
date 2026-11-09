import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FacultyScoreReport } from '../../types';
import { Users, Award, Eye, FileText, Sparkles, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner, ProgressBar } from '../../components/ui/StatCard';

export const DepartmentFacultyPage: React.FC = () => {
  const { user } = useAuth();
  const [facultyScores, setFacultyScores] = useState<FacultyScoreReport[]>([]);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const [inspectFaculty, setInspectFaculty] = useState<FacultyScoreReport | null>(null);

  const fetchDepartmentScores = async () => {
    if (!user?.departmentId) return;
    setIsLoading(true);
    try {
      const res = await api.getDepartmentScores(user.departmentId);
      if (res.success && res.data) {
        setFacultyScores(res.data.facultyScores || []);
        setAverageScore(res.data.averageScore || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentScores();
  }, [user?.departmentId]);

  if (isLoading) {
    return <LoadingSpinner text="Computing departmental faculty indexes..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Department Faculty & Performance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional performance tracking and contribution scores across {user?.department?.name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Dept Average OCI: {averageScore.toFixed(1)} / 100
          </span>
        </div>
      </div>

      {/* Faculty Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Academic Staff Evaluation Ledger</CardTitle>
            <span className="text-xs text-slate-400">
              Total {facultyScores.length} faculty member{facultyScores.length === 1 ? '' : 's'} assigned to department
            </span>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4 text-center">OCI Score (0-100)</th>
                <th className="py-3 px-4 text-center">Performance Tier</th>
                <th className="py-3 px-4 text-center">Categories Fulfilled</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facultyScores.map((report) => {
                const fulfilledCount = report.breakdown.filter((b) => b.normalizedScore >= 50).length;

                return (
                  <tr key={report.facultyId} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <span className="block">{report.facultyName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {report.departmentName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {report.employeeId}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-sm font-black text-slate-900">
                        {report.overallContributionIndex.toFixed(1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          report.tier === 'EXEMPLARY'
                            ? 'success'
                            : report.tier === 'COMMENDABLE'
                            ? 'purple'
                            : report.tier === 'SATISFACTORY'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {report.tierLabel}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-600 font-medium">
                      {fulfilledCount} / {report.breakdown.length} Categories
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectFaculty(report)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Score Breakdown
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspect Faculty Score Breakdown Modal */}
      {inspectFaculty && (
        <Modal
          isOpen={!!inspectFaculty}
          onClose={() => setInspectFaculty(null)}
          title={`Score Audit: ${inspectFaculty.facultyName}`}
          description={`Explainable calculation breakdown for ${inspectFaculty.departmentName} (ID: ${inspectFaculty.employeeId})`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Overall Contribution Index</span>
                <span className="text-2xl font-black text-slate-900">
                  {inspectFaculty.overallContributionIndex.toFixed(1)} / 100
                </span>
              </div>
              <Badge variant="purple">{inspectFaculty.tierLabel}</Badge>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {inspectFaculty.breakdown.map((b) => (
                <div key={b.categoryId} className="p-3 text-xs space-y-1 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{b.categoryName}</span>
                    <span className="font-bold text-slate-900">
                      +{b.weightedContribution.toFixed(2)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Actual: {b.actualContribution} {b.unitLabel} (Limit: {b.upperLimit})
                    </span>
                    <span>
                      Normalized: {b.normalizedScore.toFixed(0)}% × Weight: {(b.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={b.normalizedScore}
                    max={100}
                    showPercent={false}
                    color={b.normalizedScore >= 80 ? 'emerald' : 'indigo'}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectFaculty(null)}>
                Close Breakdown
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

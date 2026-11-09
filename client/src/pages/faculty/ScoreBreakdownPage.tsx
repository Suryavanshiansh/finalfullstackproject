import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FacultyScoreReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar, LoadingSpinner } from '../../components/ui/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const ScoreBreakdownPage: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<FacultyScoreReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScore = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyScore();
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Computing transparent contribution breakdown..." />;
  }

  if (!report) {
    return (
      <div className="py-12 text-center text-slate-500">
        <p>No active scoring policy found for this academic session.</p>
      </div>
    );
  }

  // Chart data preparation
  const chartData = report.breakdown.map((b) => ({
    category: b.categoryName.length > 18 ? `${b.categoryName.slice(0, 15)}...` : b.categoryName,
    fullName: b.categoryName,
    normalized: b.normalizedScore,
    weighted: b.weightedContribution,
    weightPercent: (b.weight * 100).toFixed(0),
    actual: b.actualContribution,
    limit: b.upperLimit,
    unit: b.unitLabel,
  }));

  const tierColors = {
    EXEMPLARY: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    COMMENDABLE: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    SATISFACTORY: 'bg-sky-50 text-sky-800 border-sky-300',
    DEVELOPING: 'bg-amber-50 text-amber-800 border-amber-300',
    NEEDS_IMPROVEMENT: 'bg-rose-50 text-rose-800 border-rose-300',
  }[report.tier];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Explainable Contribution Score
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent institutional index calculated under {report.policyName} (v{report.policyVersion}).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-white text-slate-700 shadow-sm">
            Session: {report.academicSessionName}
          </span>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auditable Institution Metric</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Overall Contribution Index (OCI)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            The OCI is an explainable composite benchmark computed strictly from verified, approved academic records. Each activity is normalized against session ceilings and weighted by academic senate policy.
          </p>
        </div>

        {/* Score Dial / Badge */}
        <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur rounded-2xl border border-white/20 shrink-0 w-56 text-center">
          <span className="text-xs text-indigo-200 uppercase font-bold tracking-widest">
            Final Score
          </span>
          <div className="text-5xl font-black text-white my-1">
            {report.overallContributionIndex.toFixed(1)}
          </div>
          <span className="text-[11px] text-slate-300">out of 100 possible points</span>

          <div className="mt-3 w-full pt-3 border-t border-white/10">
            <span
              className={`inline-block w-full py-1 px-2 rounded-lg text-xs font-bold border ${tierColors}`}
            >
              {report.tierLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Mathematical Formula Explanation Alert */}
      <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold">Transparent Mathematical Formula</h4>
          <p className="text-slate-700 leading-relaxed">
            <code className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-900">
              Normalized Score = 100 × min(Actual Verified Units ÷ Category Upper Limit, 1.0)
            </code>
          </p>
          <p className="text-slate-700 leading-relaxed">
            <code className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-900">
              Overall Contribution Index = ∑ (Category Weight × Normalized Score)
            </code>
          </p>
        </div>
      </div>

      {/* Visual Chart Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Normalized Performance per Activity Category</CardTitle>
            <span className="text-xs text-slate-400">
              Comparison of normalized progress (0 to 100 pts) across all evaluation categories
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} pts (${item.payload.actual} ${item.payload.unit} / max ${item.payload.limit})`,
                    'Normalized Score',
                  ]}
                />
                <Bar dataKey="normalized" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.normalized >= 80 ? '#10b981' : entry.normalized >= 40 ? '#6366f1' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Full Transparent Breakdown Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Category-by-Category Calculation Breakdown</CardTitle>
            <span className="text-xs text-slate-400">
              Complete audit ledger detailing actual approved units, upper limits, weights, and weighted score
            </span>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Evaluation Category</th>
                <th className="py-3 px-4 text-center">Actual Approved</th>
                <th className="py-3 px-4 text-center">Upper Limit</th>
                <th className="py-3 px-4 text-center">Normalized (0-100)</th>
                <th className="py-3 px-4 text-center">Policy Weight</th>
                <th className="py-3 px-4 text-right">Weighted Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.breakdown.map((row) => (
                <tr key={row.categoryId} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <span className="block">{row.categoryName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {row.approvedCount} approved submissions • {row.pendingCount} pending review
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                    {row.actualContribution} <span className="text-[10px] font-normal text-slate-400">{row.unitLabel}</span>
                  </td>

                  <td className="py-3.5 px-4 text-center text-slate-600 font-medium">
                    {row.upperLimit} <span className="text-[10px] font-normal text-slate-400">{row.unitLabel}</span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        row.normalizedScore >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : row.normalizedScore >= 40
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {row.normalizedScore.toFixed(1)}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono text-slate-700 font-semibold">
                    {(row.weight * 100).toFixed(0)}% (× {row.weight.toFixed(2)})
                  </td>

                  <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                    {row.weightedContribution.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                <td className="py-3.5 px-4 text-slate-900 text-sm" colSpan={4}>
                  Total Overall Contribution Index (OCI)
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                  100% (1.00)
                </td>
                <td className="py-3.5 px-4 text-right text-indigo-700 text-base font-black">
                  {report.overallContributionIndex.toFixed(2)} pts
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};

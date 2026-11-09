import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ScoringPolicy, ScoringPolicyItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Sliders, Save, CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner, ProgressBar } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

export const ScoringPolicyPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [policy, setPolicy] = useState<ScoringPolicy | null>(null);
  const [items, setItems] = useState<Array<{
    categoryId: string;
    categoryName: string;
    unitLabel: string;
    weight: number;
    upperLimit: number;
    description: string;
  }>>([]);

  const [policyName, setPolicyName] = useState('');
  const [policyVersion, setPolicyVersion] = useState('1.0');
  const [policyNotes, setPolicyNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPolicy = async () => {
    setIsLoading(true);
    try {
      const res = await api.getActivePolicy();
      if (res.success && res.data) {
        const p: ScoringPolicy = res.data;
        setPolicy(p);
        setPolicyName(p.name);
        setPolicyVersion(p.version);
        setPolicyNotes(p.notes || '');

        setItems(
          p.items.map((it) => ({
            categoryId: it.categoryId,
            categoryName: it.category.name,
            unitLabel: it.category.unitLabel,
            weight: it.weight,
            upperLimit: it.upperLimit,
            description: it.description || '',
          }))
        );
      }
    } catch (e: any) {
      toastError('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleItemChange = (index: number, field: 'weight' | 'upperLimit' | 'description', val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Calculate live sum of weights
  const currentTotalWeight = items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0);
  const isWeightValid = Math.abs(currentTotalWeight - 1.0) <= 0.002;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;

    if (!isWeightValid) {
      toastError(
        'Weight Constraint Violation',
        `Category weights must sum to exactly 1.0. Current sum is ${(currentTotalWeight * 100).toFixed(1)}%.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await api.updatePolicy(policy.id, {
        name: policyName,
        version: policyVersion,
        notes: policyNotes,
        items: items.map((it) => ({
          categoryId: it.categoryId,
          weight: Number(it.weight),
          upperLimit: Number(it.upperLimit),
          description: it.description,
        })),
      });

      success('Policy Updated', 'Institutional contribution weights updated and versioned.');
      fetchPolicy();
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading scoring configuration..." />;
  }

  if (!policy) {
    return (
      <div className="py-12 text-center text-slate-500">
        <p>No active scoring policy found for configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Contribution Scoring Policy
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure category weights and upper limits. All weights strictly enforced to sum to 1.0 (100%).
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!isWeightValid || isSaving}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Publish Policy Changes
        </Button>
      </div>

      {/* Live Total Weight Meter */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isWeightValid
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/80 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isWeightValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-sm">
                Weight Sum Validation:{' '}
                <span className="font-mono">
                  {(currentTotalWeight * 100).toFixed(1)}% / 100.0%
                </span>
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                {isWeightValid
                  ? 'Policy is mathematically balanced. Weights sum to 1.0 (100%).'
                  : `Invalid: Weights must sum to exactly 1.0 (current sum: ${currentTotalWeight.toFixed(3)}). Adjust weights below to enable saving.`}
              </p>
            </div>
          </div>

          <Badge variant={isWeightValid ? 'success' : 'destructive'} size="md">
            {isWeightValid ? 'BALANCED' : 'IMBALANCED'}
          </Badge>
        </div>
      </div>

      {/* Policy Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Version & Governance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Policy Name *"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              required
            />
            <Input
              label="Policy Version *"
              placeholder="e.g. 1.1, 2025.2"
              value={policyVersion}
              onChange={(e) => setPolicyVersion(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Policy Notes / Accreditation Council Scope
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              placeholder="e.g. Approved by Academic Senate on Oct 2025..."
              value={policyNotes}
              onChange={(e) => setPolicyNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Weight & Limit Grid */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Activity Category Weights & Upper Limits</CardTitle>
            <span className="text-xs text-slate-400">
              Define the relative importance (Weight) and ceiling (Upper Limit) for each category
            </span>
          </div>
        </CardHeader>

        <div className="p-6 space-y-5">
          {items.map((item, index) => (
            <div
              key={item.categoryId}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.categoryName}</h4>
                  <span className="text-[11px] text-slate-400">
                    Measured in: <span className="font-medium text-slate-700">{item.unitLabel}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-semibold text-slate-500">Weight Share:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {(item.weight * 100).toFixed(0)}% (×{item.weight.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Weight (Decimal 0.0 - 1.0) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                    value={item.weight}
                    onChange={(e) =>
                      handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category Upper Limit ({item.unitLabel}) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                    value={item.upperLimit}
                    onChange={(e) =>
                      handleItemChange(index, 'upperLimit', parseFloat(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Evaluation Criterion Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short accreditation rubric..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!isWeightValid || isSaving}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Publish Policy Changes
        </Button>
      </div>
    </div>
  );
};

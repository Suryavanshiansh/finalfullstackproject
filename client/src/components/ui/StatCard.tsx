import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; isPositive: boolean };
  color?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'purple';
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, trend, color = 'indigo', onClick }) => {
  const colorStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }[color];

  return (
    <Card
      onClick={onClick}
      className={twMerge(
        clsx(
          'p-5 transition-all',
          onClick && 'cursor-pointer hover:border-indigo-300 hover:shadow-md'
        )
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colorStyles} shadow-sm shrink-0`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export const ProgressBar: React.FC<{
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
  className?: string;
}> = ({ value, max = 100, label, showPercent = true, color = 'indigo', className }) => {
  const percent = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const colors = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[color];

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          {label && <span>{label}</span>}
          {showPercent && <span>{percent}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionText, onAction }) => {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
      <div className="p-4 bg-slate-100 rounded-2xl text-slate-500 mb-4 border border-slate-200">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="py-16 flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-500 font-medium">{text}</p>
    </div>
  );
};

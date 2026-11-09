import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FacultyAvailability } from '../../types';
import { useToast } from '../../context/ToastContext';
import { CalendarCheck2, Save, Sun, Moon, Check, Ban, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/StatCard';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const FacultyAvailabilityPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [availability, setAvailability] = useState<
    Record<
      string,
      {
        preferredSlot: 'MORNING' | 'AFTERNOON' | 'ANY' | 'UNAVAILABLE';
        maxDailyHours: number;
        notes: string;
      }
    >
  >({});

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAvailability();
      const initial: Record<string, any> = {};

      DAYS_OF_WEEK.forEach((day) => {
        initial[day] = {
          preferredSlot: day === 'SATURDAY' ? 'UNAVAILABLE' : 'ANY',
          maxDailyHours: 6.0,
          notes: '',
        };
      });

      if (res.success && Array.isArray(res.data)) {
        res.data.forEach((item: FacultyAvailability) => {
          initial[item.dayOfWeek] = {
            preferredSlot: item.preferredSlot,
            maxDailyHours: item.maxDailyHours || 6.0,
            notes: item.notes || '',
          };
        });
      }

      setAvailability(initial);
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const handleChange = (day: string, field: string, value: any) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day,
        preferredSlot: availability[day].preferredSlot,
        maxDailyHours: Number(availability[day].maxDailyHours),
        notes: availability[day].notes,
      }));

      await api.updateAvailability(payload);
      success('Availability Saved', 'Your weekly timetable preferences have been updated.');
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading availability schedule..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Faculty Teaching Availability
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set your preferred teaching windows and daily limits used by the Smart Scheduling engine.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Availability
        </Button>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const config = availability[day] || {
            preferredSlot: 'ANY',
            maxDailyHours: 6,
            notes: '',
          };

          return (
            <Card
              key={day}
              className={`p-5 transition-all ${
                config.preferredSlot === 'UNAVAILABLE'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900 tracking-wide">
                  {day}
                </span>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    config.preferredSlot === 'UNAVAILABLE'
                      ? 'bg-rose-50 text-rose-700'
                      : config.preferredSlot === 'MORNING'
                      ? 'bg-amber-50 text-amber-700'
                      : config.preferredSlot === 'AFTERNOON'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {config.preferredSlot}
                </span>
              </div>

              <div className="space-y-4 pt-4 text-xs">
                {/* Slot Choice Buttons */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-2">
                    Time Window Preference
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'ANY', label: 'Any Slot', icon: Check },
                      { id: 'MORNING', label: 'Morning', icon: Sun },
                      { id: 'AFTERNOON', label: 'Afternoon', icon: Moon },
                      { id: 'UNAVAILABLE', label: 'Off Duty', icon: Ban },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleChange(day, 'preferredSlot', opt.id)}
                        className={`py-2 px-1 rounded-lg text-center font-medium border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          config.preferredSlot === opt.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {config.preferredSlot !== 'UNAVAILABLE' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 font-semibold text-slate-700">
                      <span>Max Daily Teaching Hours</span>
                      <span className="text-indigo-600 font-bold">{config.maxDailyHours} hrs</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={config.maxDailyHours}
                      onChange={(e) =>
                        handleChange(day, 'maxDailyHours', parseInt(e.target.value, 10))
                      }
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Special Notes / Committee Duties
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NBA meeting 2-3pm, Lab session only"
                    value={config.notes}
                    onChange={(e) => handleChange(day, 'notes', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Availability Settings
        </Button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ScheduleEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, MapPin, Printer, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/StatCard';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const PERIODS = [
  { period: 1, label: '09:00 - 10:00', name: 'Period 1' },
  { period: 2, label: '10:15 - 11:15', name: 'Period 2' },
  { period: 3, label: '11:30 - 12:30', name: 'Period 3' },
  { period: 4, label: '13:30 - 14:30', name: 'Period 4' },
  { period: 5, label: '14:45 - 15:45', name: 'Period 5' },
];

export const FacultyTimetablePage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimetable = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTimetable({ facultyId: user?.id });
      if (res.success && res.data) {
        setEntries(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [user?.id]);

  if (isLoading) {
    return <LoadingSpinner text="Loading timetable schedule..." />;
  }

  // Map entries by day and period
  const timetableMap: Record<string, ScheduleEntry> = {};
  entries.forEach((e) => {
    const key = `${e.dayOfWeek}_${e.timeSlot.periodNumber}`;
    timetableMap[key] = e;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Weekly Teaching Timetable
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Allocated lectures, laboratories, and classroom venues for Dr. {user?.firstName} {user?.lastName} ({user?.department?.code})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
            Total Load: {entries.length} hrs / week
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Timetable
          </Button>
        </div>
      </div>

      {/* Grid Timetable */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="py-3 px-4 border-b border-slate-800 w-28">Period / Day</th>
                {DAYS.map((day) => (
                  <th key={day} className="py-3 px-4 border-b border-slate-800 text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {PERIODS.map((period) => (
                <tr key={period.period} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-3.5 bg-slate-50/80 font-semibold border-r border-slate-200 whitespace-nowrap">
                    <span className="block text-slate-800 font-bold">{period.name}</span>
                    <span className="text-[10px] text-slate-500">{period.label}</span>
                  </td>

                  {DAYS.map((day) => {
                    const key = `${day}_${period.period}`;
                    const entry = timetableMap[key];

                    if (!entry) {
                      return (
                        <td
                          key={day}
                          className="py-3 px-3 text-center border-r border-slate-100 text-slate-300"
                        >
                          —
                        </td>
                      );
                    }

                    return (
                      <td
                        key={day}
                        className="py-2.5 px-3 border-r border-slate-100 align-top"
                      >
                        <div className="p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 shadow-sm text-left">
                          <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                            {entry.course.code}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 mt-1 truncate">
                            {entry.course.name}
                          </p>
                          <div className="mt-1.5 pt-1.5 border-t border-indigo-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-indigo-500" />
                              {entry.classroom.roomNumber}
                            </span>
                            <span className="text-indigo-600 font-medium">
                              {entry.classroom.type === 'COMPUTER_LAB' ? 'Lab' : 'Lecture'}
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Course, Classroom, TimeSlot, User, ScheduleEntry } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Save,
  Trash2,
  MapPin,
  BookOpen,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmationModal } from '../../components/ui/Modal';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const PERIODS = [
  { period: 1, label: '09:00 - 10:00', name: 'Period 1' },
  { period: 2, label: '10:15 - 11:15', name: 'Period 2' },
  { period: 3, label: '11:30 - 12:30', name: 'Period 3' },
  { period: 4, label: '13:30 - 14:30', name: 'Period 4' },
  { period: 5, label: '14:45 - 15:45', name: 'Period 5' },
];

export const SmartSchedulerPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [facultyList, setFacultyList] = useState<User[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [timetable, setTimetable] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Conflict Checker Modal State
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkCourseId, setCheckCourseId] = useState('');
  const [checkFacultyId, setCheckFacultyId] = useState('');
  const [checkClassroomId, setCheckClassroomId] = useState('');
  const [checkTimeSlotId, setCheckTimeSlotId] = useState('');
  const [checkDayOfWeek, setCheckDayOfWeek] = useState('MONDAY');
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Generator & Suggestions State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<any[]>([]);
  const [unassignedList, setUnassignedList] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);

  const fetchBasics = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, roomsRes, slotsRes, facRes, sessRes] = await Promise.all([
        api.getCourses(),
        api.getClassrooms(),
        api.getTimeSlots(),
        api.getUsers({ role: 'FACULTY' }),
        api.getAcademicSessions(),
      ]);

      if (coursesRes.success) setCourses(coursesRes.data);
      if (roomsRes.success) setClassrooms(roomsRes.data);
      if (slotsRes.success) setTimeSlots(slotsRes.data);
      if (facRes.success) setFacultyList(facRes.data);
      if (sessRes.success) {
        setSessions(sessRes.data);
        const cur = sessRes.data.find((s: any) => s.isCurrent) || sessRes.data[0];
        if (cur) setSelectedSessionId(cur.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimetable = async () => {
    if (!selectedSessionId) return;
    try {
      const res = await api.getTimetable({ academicSessionId: selectedSessionId });
      if (res.success) setTimetable(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBasics();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [selectedSessionId]);

  const handleRunConflictCheck = async () => {
    if (!checkCourseId || !checkFacultyId || !checkClassroomId || !checkTimeSlotId) {
      toastError('Missing Fields', 'Select all assignment dimensions to run conflict analysis.');
      return;
    }

    setIsChecking(true);
    try {
      const res = await api.checkConflicts({
        academicSessionId: selectedSessionId,
        courseId: checkCourseId,
        facultyId: checkFacultyId,
        classroomId: checkClassroomId,
        timeSlotId: checkTimeSlotId,
        dayOfWeek: checkDayOfWeek,
      });

      if (res.success) {
        setConflictResult(res.data);
      }
    } catch (err: any) {
      toastError('Check Failed', err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerateFeasible = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generateSchedule({ academicSessionId: selectedSessionId });
      if (res.success && res.data) {
        setGeneratedSuggestions(res.data.suggestions || []);
        setUnassignedList(res.data.unassigned || []);
        setIsGeneratorOpen(true);
      }
    } catch (err: any) {
      toastError('Generation Failed', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitSchedule = async () => {
    if (generatedSuggestions.length === 0) return;
    setIsCommitting(true);
    try {
      const entries = generatedSuggestions.map((s) => ({
        courseId: s.courseId,
        facultyId: s.facultyId,
        classroomId: s.classroomId,
        timeSlotId: s.timeSlotId,
        dayOfWeek: s.dayOfWeek,
      }));

      await api.commitSchedule({
        academicSessionId: selectedSessionId,
        entries,
        clearExisting: true,
      });

      success('Timetable Published', `Committed ${entries.length} conflict-free schedule entries.`);
      setConfirmCommitOpen(false);
      setIsGeneratorOpen(false);
      fetchTimetable();
    } catch (err: any) {
      toastError('Commit Failed', err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.deleteScheduleEntry(id);
      success('Entry Removed', 'Schedule entry deleted.');
      fetchTimetable();
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Initializing smart scheduling engine..." />;
  }

  // Timetable map
  const timetableMap: Record<string, ScheduleEntry[]> = {};
  timetable.forEach((e) => {
    const key = `${e.dayOfWeek}_${e.timeSlot.periodNumber}`;
    if (!timetableMap[key]) timetableMap[key] = [];
    timetableMap[key].push(e);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Smart Scheduling & Timetable Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Constraint satisfaction optimization matching faculty availability, workload ceilings, room clashes, and certified expertise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConflictResult(null);
              if (courses.length > 0) setCheckCourseId(courses[0].id);
              if (facultyList.length > 0) setCheckFacultyId(facultyList[0].id);
              if (classrooms.length > 0) setCheckClassroomId(classrooms[0].id);
              if (timeSlots.length > 0) setCheckTimeSlotId(timeSlots[0].id);
              setIsCheckModalOpen(true);
            }}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Live Conflict Check
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateFeasible}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Generate Feasible Timetable
          </Button>
        </div>
      </div>

      {/* Constraints Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900">Hard Constraint 1: Clashing</h4>
            <p className="text-slate-500 mt-0.5 leading-relaxed">
              Strictly prevents faculty or classrooms from overlapping assignments in any period.
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900">Hard Constraint 2: Expertise & Limit</h4>
            <p className="text-slate-500 mt-0.5 leading-relaxed">
              Enforces primary course qualification and caps teaching hours at 16 hrs/week.
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900">Soft Constraint: Preferences</h4>
            <p className="text-slate-500 mt-0.5 leading-relaxed">
              Honors faculty time-window choices (Morning vs Afternoon) and reduces idle gaps.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Timetable */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle>Master Institution Timetable Grid</CardTitle>
              <span className="text-xs text-slate-400">
                {timetable.length} active lecture and lab assignments scheduled
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="py-3 px-4 border-b border-slate-800 w-28">Slot / Day</th>
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
                    const entries = timetableMap[key] || [];

                    if (entries.length === 0) {
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
                        className="py-2 px-2.5 border-r border-slate-100 align-top space-y-1.5"
                      >
                        {entries.map((e) => (
                          <div
                            key={e.id}
                            className="p-2 rounded-lg bg-indigo-50/90 border border-indigo-200 shadow-sm relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                                {e.course.code}
                              </span>
                              <button
                                onClick={() => handleDeleteEntry(e.id)}
                                className="text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-900 mt-0.5 truncate">
                              {e.faculty.firstName} {e.faculty.lastName}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-indigo-500" />
                                {e.classroom.roomNumber}
                              </span>
                              <span className="text-slate-400 font-medium">
                                {e.course.credits} Cr
                              </span>
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live Conflict Analysis Modal */}
      <Modal
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        title="Live Constraint & Conflict Analysis"
        description="Verify whether an assignment violates faculty availability, room clashes, or workload limits."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Course *"
              value={checkCourseId}
              onChange={(e) => setCheckCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Faculty Member *"
              value={checkFacultyId}
              onChange={(e) => setCheckFacultyId(e.target.value)}
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  Dr. {f.firstName} {f.lastName} ({f.employeeId})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Classroom *"
              value={checkClassroomId}
              onChange={(e) => setCheckClassroomId(e.target.value)}
            >
              {classrooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.type})
                </option>
              ))}
            </Select>

            <Select
              label="Day of Week *"
              value={checkDayOfWeek}
              onChange={(e) => setCheckDayOfWeek(e.target.value)}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>

            <Select
              label="Time Slot *"
              value={checkTimeSlotId}
              onChange={(e) => setCheckTimeSlotId(e.target.value)}
            >
              {timeSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunConflictCheck}
              isLoading={isChecking}
            >
              Run Conflict Check
            </Button>
          </div>

          {/* Result Output Box */}
          {conflictResult && (
            <div
              className={`p-4 rounded-xl border space-y-2 text-xs ${
                conflictResult.valid
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm">
                {conflictResult.valid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Feasible Assignment: No Hard Conflicts Detected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>Assignment Infeasible: Hard Constraints Violated</span>
                  </>
                )}
              </div>

              {conflictResult.conflicts.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 font-semibold text-rose-800">
                  {conflictResult.conflicts.map((c: string, idx: number) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              )}

              {conflictResult.warnings.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-amber-700 block mb-1">
                    Soft Preference Warnings:
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-amber-800">
                    {conflictResult.warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Generated Suggestions Modal */}
      {isGeneratorOpen && (
        <Modal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          title="Generated Feasible Schedule Suggestions"
          description={`Constraint-satisfaction solver generated ${generatedSuggestions.length} non-conflicting allocations.`}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">
                  Allocated: {generatedSuggestions.length} Teaching Slots
                </span>
                <p className="text-slate-400 mt-0.5">
                  Every assignment satisfies faculty qualification, availability, and room capacity.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmCommitOpen(true)}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Confirm & Publish Schedule
              </Button>
            </div>

            {unassignedList.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <span className="font-bold block mb-1">Bottleneck Warnings ({unassignedList.length}):</span>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {unassignedList.map((u, i) => (
                    <li key={i}>
                      <span className="font-semibold">{u.courseCode}:</span> {u.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {generatedSuggestions.map((s, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-indigo-700 mr-2">{s.courseCode}</span>
                    <span className="font-semibold text-slate-800">{s.courseName}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Instructor: <span className="font-medium text-slate-700">{s.facultyName}</span>
                    </p>
                  </div>

                  <div className="text-right text-[11px]">
                    <span className="font-bold text-slate-900 block">{s.dayOfWeek} • {s.timeSlotLabel}</span>
                    <span className="text-indigo-600 font-medium">Room: {s.roomNumber}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsGeneratorOpen(false)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmCommitOpen(true)}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Confirm & Publish Timetable
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmCommitOpen}
        onClose={() => setConfirmCommitOpen(false)}
        onConfirm={handleCommitSchedule}
        title="Confirm Timetable Publication"
        message="Are you sure you want to commit these generated assignments? Existing entries for this academic term will be updated with the verified conflict-free schedule."
        confirmText="Publish Schedule"
        variant="primary"
        isLoading={isCommitting}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Course, Department, User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { BookOpen, Plus, UserCheck, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';

export const CourseManagementPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyList, setFacultyList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Course Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [credits, setCredits] = useState(3);
  const [semester, setSemester] = useState(1);
  const [lectureHours, setLectureHours] = useState(3);
  const [labHours, setLabHours] = useState(0);

  // Assign Expertise Form State
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState('PRIMARY');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, deptRes, facRes] = await Promise.all([
        api.getCourses(),
        api.getDepartments(),
        api.getUsers({ role: 'FACULTY' }),
      ]);

      if (coursesRes.success) setCourses(coursesRes.data);
      if (deptRes.success) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0 && !departmentId) {
          setDepartmentId(deptRes.data[0].id);
        }
      }
      if (facRes.success) {
        setFacultyList(facRes.data);
        if (facRes.data.length > 0 && !selectedFacultyId) {
          setSelectedFacultyId(facRes.data[0].id);
        }
      }
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createCourse({
        code,
        name,
        departmentId,
        credits: Number(credits),
        semester: Number(semester),
        lectureHoursPerWeek: Number(lectureHours),
        labHoursPerWeek: Number(labHours),
      });
      success('Course Added', `Successfully created ${code} - ${name}`);
      setIsCreateOpen(false);
      setCode('');
      setName('');
      fetchData();
    } catch (err: any) {
      toastError('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignExpertise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourse || !selectedFacultyId) return;

    setIsSubmitting(true);
    try {
      await api.assignExpertise({
        courseId: assignCourse.id,
        facultyId: selectedFacultyId,
        proficiencyLevel,
      });
      success('Expertise Registered', 'Faculty qualification added to course.');
      setAssignCourse(null);
      fetchData();
    } catch (err: any) {
      toastError('Assignment Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Curriculum Courses & Faculty Expertise
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Course catalog and certified faculty competencies required by the Smart Scheduling engine.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setCode('');
            setName('');
            setIsCreateOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Course
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Curriculum Registry</CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Loading courses catalog..." />
          ) : courses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="No courses registered"
              description="Add courses and assign faculty expertise for timetable scheduling."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Course Code & Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Semester / Credits</th>
                  <th className="py-3 px-4 text-center">Hours (L+P)</th>
                  <th className="py-3 px-4">Certified Faculty Expertise</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mr-2">
                        {c.code}
                      </span>
                      <span>{c.name}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {c.department?.name || 'Central'}
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-700">
                      Sem {c.semester} • <span className="font-bold">{c.credits} Credits</span>
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                      {c.lectureHoursPerWeek}L + {c.labHoursPerWeek}P
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.expertises && c.expertises.length > 0 ? (
                          c.expertises.map((exp) => (
                            <span
                              key={exp.id}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                exp.proficiencyLevel === 'PRIMARY'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              }`}
                            >
                              {exp.faculty.firstName} {exp.faculty.lastName} ({exp.proficiencyLevel[0]})
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">
                            No faculty certified
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssignCourse(c);
                          if (facultyList.length > 0) setSelectedFacultyId(facultyList[0].id);
                        }}
                        leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                      >
                        Assign Expertise
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Course Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Course to Curriculum"
        description="Configure academic course requirements, credits, and weekly instruction hours."
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Course Code *"
              placeholder="e.g. CS401, EC302"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Select
              label="Academic Department *"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Course Title *"
            placeholder="e.g. Distributed Operating Systems"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-4 gap-2">
            <Input
              label="Credits"
              type="number"
              min="1"
              max="10"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value, 10))}
            />
            <Input
              label="Semester"
              type="number"
              min="1"
              max="8"
              value={semester}
              onChange={(e) => setSemester(parseInt(e.target.value, 10))}
            />
            <Input
              label="Lecture Hrs/Wk"
              type="number"
              min="0"
              max="10"
              value={lectureHours}
              onChange={(e) => setLectureHours(parseInt(e.target.value, 10))}
            />
            <Input
              label="Lab Hrs/Wk"
              type="number"
              min="0"
              max="10"
              value={labHours}
              onChange={(e) => setLabHours(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Expertise Modal */}
      {assignCourse && (
        <Modal
          isOpen={!!assignCourse}
          onClose={() => setAssignCourse(null)}
          title={`Assign Qualified Faculty: ${assignCourse.code}`}
          description={`Select an academic staff member qualified to deliver ${assignCourse.name}.`}
          maxWidth="sm"
        >
          <form onSubmit={handleAssignExpertise} className="space-y-4">
            <Select
              label="Faculty Member *"
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  Dr. {f.firstName} {f.lastName} ({f.employeeId})
                </option>
              ))}
            </Select>

            <Select
              label="Proficiency Level"
              value={proficiencyLevel}
              onChange={(e) => setProficiencyLevel(e.target.value)}
            >
              <option value="PRIMARY">PRIMARY (Primary Instructor)</option>
              <option value="SECONDARY">SECONDARY (Qualified Backup / Lab)</option>
            </Select>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignCourse(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Qualification
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

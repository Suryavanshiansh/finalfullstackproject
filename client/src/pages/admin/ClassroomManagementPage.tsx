import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Classroom } from '../../types';
import { useToast } from '../../context/ToastContext';
import { DoorOpen, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner, EmptyState } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

export const ClassroomManagementPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState(60);
  const [type, setType] = useState('LECTURE_HALL');

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await api.getClassrooms();
      if (res.success) setClassrooms(res.data);
    } catch (e: any) {
      toastError('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createClassroom({
        roomNumber,
        building,
        capacity: Number(capacity),
        type,
      });
      success('Classroom Registered', `Added venue ${roomNumber}`);
      setIsCreateOpen(false);
      setRoomNumber('');
      setBuilding('');
      fetchRooms();
    } catch (err: any) {
      toastError('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (room: Classroom) => {
    try {
      await api.updateClassroom(room.id, { isAvailable: !room.isAvailable });
      success(
        'Status Updated',
        `Classroom ${room.roomNumber} is now ${!room.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}.`
      );
      fetchRooms();
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Classrooms & Campus Venues
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage lecture halls, specialized laboratories, and venue availability for timetabling.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setRoomNumber('');
            setBuilding('');
            setIsCreateOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Classroom
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Physical Venues Directory</CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner text="Loading campus venues..." />
          ) : classrooms.length === 0 ? (
            <EmptyState
              icon={<DoorOpen className="w-8 h-8" />}
              title="No classrooms configured"
              description="Add lecture halls and computer labs."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4">Campus Building</th>
                  <th className="py-3 px-4 text-center">Student Capacity</th>
                  <th className="py-3 px-4 text-center">Facility Type</th>
                  <th className="py-3 px-4 text-center">Current Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classrooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {room.roomNumber}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {room.building}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                      {room.capacity} seats
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          room.type === 'COMPUTER_LAB'
                            ? 'purple'
                            : room.type === 'SEMINAR_HALL'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {room.type.replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          room.isAvailable ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {room.isAvailable ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {room.isAvailable ? 'Available' : 'Maintenance / Offline'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAvailability(room)}
                      >
                        {room.isAvailable ? 'Set Offline' : 'Set Available'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Classroom Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Campus Classroom / Laboratory"
        description="Register venue capacity and type for timetabling allocations."
        maxWidth="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Room Identifier *"
            placeholder="e.g. LH-201, CS-LAB-3"
            required
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />

          <Input
            label="Building / Wing *"
            placeholder="e.g. Turing Science Block"
            required
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Seating Capacity *"
              type="number"
              min="10"
              max="500"
              required
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
            />

            <Select
              label="Venue Type *"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="LECTURE_HALL">Lecture Hall</option>
              <option value="COMPUTER_LAB">Computer Lab</option>
              <option value="SEMINAR_HALL">Seminar Hall</option>
            </Select>
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
              Add Venue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

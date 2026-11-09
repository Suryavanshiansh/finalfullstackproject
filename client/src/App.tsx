import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';

// Faculty Pages
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { ActivitiesPage } from './pages/faculty/ActivitiesPage';
import { ActivityDetailPage } from './pages/faculty/ActivityDetailPage';
import { ScoreBreakdownPage } from './pages/faculty/ScoreBreakdownPage';
import { FacultyAvailabilityPage } from './pages/faculty/FacultyAvailabilityPage';
import { FacultyTimetablePage } from './pages/faculty/FacultyTimetablePage';

// Reviewer Pages
import { ReviewerDashboard } from './pages/reviewer/ReviewerDashboard';
import { ApprovalQueuePage } from './pages/reviewer/ApprovalQueuePage';
import { DepartmentFacultyPage } from './pages/reviewer/DepartmentFacultyPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { DepartmentManagementPage } from './pages/admin/DepartmentManagementPage';
import { CourseManagementPage } from './pages/admin/CourseManagementPage';
import { ClassroomManagementPage } from './pages/admin/ClassroomManagementPage';
import { ScoringPolicyPage } from './pages/admin/ScoringPolicyPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Shared Pages
import { SmartSchedulerPage } from './pages/shared/SmartSchedulerPage';
import { ReportsPage } from './pages/shared/ReportsPage';
import { ProfileSettingsPage } from './pages/shared/ProfileSettingsPage';

const RoleBasedRedirect: React.FC = () => {
  const { role } = useAuth();
  if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'REVIEWER') return <Navigate to="/reviewer/dashboard" replace />;
  return <Navigate to="/faculty/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Authenticated Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleBasedRedirect />} />

              {/* Faculty Routes */}
              <Route
                path="faculty/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="faculty/activities"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                    <ActivitiesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="faculty/activities/:id"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN', 'REVIEWER']}>
                    <ActivityDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="faculty/score"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                    <ScoreBreakdownPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="faculty/availability"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                    <FacultyAvailabilityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="faculty/timetable"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                    <FacultyTimetablePage />
                  </ProtectedRoute>
                }
              />

              {/* Reviewer / Department Head Routes */}
              <Route
                path="reviewer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['REVIEWER', 'ADMIN']}>
                    <ReviewerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reviewer/queue"
                element={
                  <ProtectedRoute allowedRoles={['REVIEWER', 'ADMIN']}>
                    <ApprovalQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reviewer/faculty"
                element={
                  <ProtectedRoute allowedRoles={['REVIEWER', 'ADMIN']}>
                    <DepartmentFacultyPage />
                  </ProtectedRoute>
                }
              />

              {/* Administrator Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/departments"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <DepartmentManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/courses"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <CourseManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/classrooms"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <ClassroomManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/scoring-policy"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <ScoringPolicyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Protected Modules */}
              <Route
                path="scheduler"
                element={
                  <ProtectedRoute allowedRoles={['REVIEWER', 'ADMIN', 'FACULTY']}>
                    <SmartSchedulerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'REVIEWER', 'ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <ProfileSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;

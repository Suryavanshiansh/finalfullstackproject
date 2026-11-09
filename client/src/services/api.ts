const RAW_API_URL = (import.meta.env.VITE_API_URL as string) || '';
const API_HOST = RAW_API_URL.replace(/\/+$/, '');
const API_BASE = `${API_HOST}/api/v1`;

export const getUploadUrl = (fileName: string) => `${API_HOST}/uploads/${fileName}`;

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('fpis_token');

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle CSV file download responses directly
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = json?.error || {};
    throw new ApiError(
      error.message || `Request failed with status ${response.status}`,
      error.code,
      error.details
    );
  }

  return json;
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request<any>('/auth/me'),
  updateProfile: (data: any) => request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: any) => request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Activities
  getCategories: () => request<any>('/activities/categories'),
  getActivities: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any>(`/activities?${q.toString()}`);
  },
  getActivity: (id: string) => request<any>(`/activities/${id}`),
  createActivity: (data: any) => request<any>('/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id: string, data: any) => request<any>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteActivity: (id: string) => request<any>(`/activities/${id}`, { method: 'DELETE' }),
  submitActivity: (id: string) => request<any>(`/activities/${id}/submit`, { method: 'POST' }),
  resubmitActivity: (id: string, notes: string) =>
    request<any>(`/activities/${id}/resubmit`, { method: 'POST', body: JSON.stringify({ notes }) }),
  uploadEvidence: (activityId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<any>(`/activities/${activityId}/evidence`, { method: 'POST', body: fd });
  },
  deleteEvidence: (evidenceId: string) => request<any>(`/activities/evidence/${evidenceId}`, { method: 'DELETE' }),
  getFacultyMetrics: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return request<any>(`/activities/metrics/faculty?${q.toString()}`);
  },

  // Approvals (Reviewer & Admin)
  getApprovalQueue: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any>(`/approvals/queue?${q.toString()}`);
  },
  getReviewerStats: (departmentId?: string) =>
    request<any>(`/approvals/stats${departmentId ? `?departmentId=${departmentId}` : ''}`),
  startReview: (id: string) => request<any>(`/approvals/${id}/start-review`, { method: 'POST' }),
  approveActivity: (id: string, data: { approvedValue?: number; feedback?: string }) =>
    request<any>(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  rejectActivity: (id: string, reason: string) =>
    request<any>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  requestCorrection: (id: string, explanation: string) =>
    request<any>(`/approvals/${id}/request-correction`, {
      method: 'POST',
      body: JSON.stringify({ explanation }),
    }),

  // Scoring
  getMyScore: (sessionId?: string) =>
    request<any>(`/scoring/my-score${sessionId ? `?academicSessionId=${sessionId}` : ''}`),
  getFacultyScore: (facultyId: string, sessionId?: string) =>
    request<any>(`/scoring/faculty/${facultyId}${sessionId ? `?academicSessionId=${sessionId}` : ''}`),
  getDepartmentScores: (departmentId: string, sessionId?: string) =>
    request<any>(`/scoring/department/${departmentId}${sessionId ? `?academicSessionId=${sessionId}` : ''}`),
  getActivePolicy: (sessionId?: string) =>
    request<any>(`/scoring/policy/active${sessionId ? `?academicSessionId=${sessionId}` : ''}`),
  updatePolicy: (policyId: string, data: any) =>
    request<any>(`/scoring/policy/${policyId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Scheduling
  getTimetable: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any>(`/scheduling/timetable?${q.toString()}`);
  },
  checkConflicts: (data: any) => request<any>('/scheduling/check-conflicts', { method: 'POST', body: JSON.stringify(data) }),
  generateSchedule: (data: { academicSessionId: string; departmentId?: string }) =>
    request<any>('/scheduling/generate', { method: 'POST', body: JSON.stringify(data) }),
  commitSchedule: (data: any) =>
    request<any>('/scheduling/commit', { method: 'POST', body: JSON.stringify(data) }),
  deleteScheduleEntry: (id: string) => request<any>(`/scheduling/entries/${id}`, { method: 'DELETE' }),
  getAvailability: (facultyId?: string) =>
    request<any>(`/scheduling/availability${facultyId ? `?facultyId=${facultyId}` : ''}`),
  updateAvailability: (data: any[]) =>
    request<any>('/scheduling/availability', { method: 'PUT', body: JSON.stringify(data) }),

  // Admin
  getAdminStats: () => request<any>('/admin/stats'),
  getUsers: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any>(`/admin/users?${q.toString()}`);
  },
  createUser: (data: any) => request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetPassword: (id: string, newPassword: string) =>
    request<any>(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  getDepartments: () => request<any>('/admin/departments'),
  createDepartment: (data: any) => request<any>('/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: any) => request<any>(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCourses: (departmentId?: string) =>
    request<any>(`/admin/courses${departmentId ? `?departmentId=${departmentId}` : ''}`),
  createCourse: (data: any) => request<any>('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
  assignExpertise: (data: any) => request<any>('/admin/courses/assign-expertise', { method: 'POST', body: JSON.stringify(data) }),
  getClassrooms: () => request<any>('/admin/classrooms'),
  createClassroom: (data: any) => request<any>('/admin/classrooms', { method: 'POST', body: JSON.stringify(data) }),
  updateClassroom: (id: string, data: any) => request<any>(`/admin/classrooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getTimeSlots: () => request<any>('/admin/time-slots'),
  getAcademicSessions: () => request<any>('/admin/academic-sessions'),
  createAcademicSession: (data: any) => request<any>('/admin/academic-sessions', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any>(`/admin/audit-logs?${q.toString()}`);
  },

  // Reporting & Export
  getFacultyReport: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return request<any>(`/reports/faculty-contribution?${q.toString()}`);
  },
  getDepartmentAnalytics: (sessionId?: string) =>
    request<any>(`/reports/department-analytics${sessionId ? `?academicSessionId=${sessionId}` : ''}`),
  getActivityParticipation: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return request<any>(`/reports/activity-participation?${q.toString()}`);
  },
  exportCSV: async (type: string, params: Record<string, any> = {}) => {
    const q = new URLSearchParams({ type, ...params });
    const token = localStorage.getItem('fpis_token');
    const response = await fetch(`${API_BASE}/reports/export/csv?${q.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fpis-${type}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Notifications
  getNotifications: () => request<any>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'PUT' }),
};

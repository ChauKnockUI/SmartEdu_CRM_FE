import { getApiConfig } from './apiConfig';
import type { AttendanceSummary } from '../../shared/utils/attendance';
import type { MaterialSession } from './material.service';

export type DashboardMaterial = {
  id: number; classId: number; className: string; title: string; date: string;
  fileName: string; fileSize: number | null; schedule: MaterialSession | null; action: string;
};

const config = getApiConfig();

const getAuthHeader = (token = localStorage.getItem('token')) => ({
  ...config.headers,
  Authorization: `Bearer ${token}`,
});

export type DashboardRole = 'admin' | 'sale' | 'teacher' | 'student';
export type DashboardAlert = {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  action?: string;
  count?: number;
};
export type DashboardActivity = {
  id: string;
  actor: string;
  text: string;
  time: string;
  action?: string;
};
export type StudentClassProgress = {
  classId: number; className: string; courseName: string | null;
  classStatus: string; enrollmentStatus: string;
  plannedSessions: number | null; scheduledSessions: number;
  heldSessions: number; attendedSessions: number; absentSessions: number; excusedSessions: number;
  pendingMakeupSessions: number; awaitingConfirmationSessions: number; progressPercent: number | null;
};
export type DashboardOverview = {
  role: DashboardRole;
  links?: Record<string, string>;
  kpis: Record<string, number | null>;
  attendance?: AttendanceSummary;
  charts?: {
    revenueLast6Months?: Array<{ month: string; revenue: number }>;
    leadSources?: Array<{ name: string; value: number }>;
  };
  alerts?: DashboardAlert[];
  activities?: DashboardActivity[];
  lists?: Record<string, any> & { classProgress?: StudentClassProgress[] };
};

export type DashboardWork = {
  role: DashboardRole; as_of: string; category: string;
  groups: { key: string; label: string; description: string; total: number }[];
  items: { id: string; title: string; reason: string; since: string | null; since_label: string;
    waiting_days?: number; amount?: number; action: string; action_label: string }[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const dashboardService = {
  getOverview: async (signal?: AbortSignal, token?: string): Promise<DashboardOverview> => {
    const res = await fetch(`${config.baseURL}/dashboard/overview`, {
      headers: getAuthHeader(token), signal,
    });

    const json = await res.json();
    if (!res.ok || !json.success || !json.data) throw new Error(json.message || 'Không tải được dữ liệu dashboard');
    return json.data;
  },
  getWork: async (params: { category?: string; page?: number; view?: 'summary' | 'list' } = {}, signal?: AbortSignal, token?: string): Promise<DashboardWork> => {
    const query = new URLSearchParams({ page: String(params.page || 1), limit: '5' });
    if (params.category) query.set('category', params.category);
    if (params.view) query.set('view', params.view);
    const res = await fetch(`${config.baseURL}/dashboard/work?${query}`, { headers: getAuthHeader(token), signal });
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.data?.groups) || !Array.isArray(json.data?.items)
      || !Number.isInteger(json.data?.pagination?.total) || json.data.pagination.total < 0)
      throw new Error(json.message || 'Không tải được công việc cần xử lý.');
    if (params.view === 'list' && json.data.items.length !== json.data.pagination.total)
      throw new Error('Chưa tải đủ danh sách cảnh báo. Vui lòng tải lại.');
    return json.data;
  },
};

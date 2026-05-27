import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export type DashboardRole = 'admin' | 'sale' | 'teacher' | 'student';
export type DashboardAlert = {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  action?: string;
};
export type DashboardActivity = {
  id: string;
  actor: string;
  text: string;
  time: string;
};
export type DashboardOverview = {
  role: DashboardRole;
  kpis: Record<string, number>;
  charts?: {
    revenueLast6Months?: Array<{ month: string; revenue: number }>;
    leadSources?: Array<{ name: string; value: number }>;
  };
  alerts?: DashboardAlert[];
  activities?: DashboardActivity[];
  lists?: Record<string, any>;
};

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverview> => {
    const res = await fetch(`${config.baseURL}/dashboard/overview`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không tải được dữ liệu dashboard');
    return json.data;
  },
};

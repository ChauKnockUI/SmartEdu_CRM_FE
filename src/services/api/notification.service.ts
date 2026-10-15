import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export interface NotificationItem {
  id: number;
  user_id: number;
  type: 'general' | 'attendance_reminder' | 'overdue_attendance' | 'system_alert';
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  metadata?: any;
  createdAt: string;
}

export const notificationService = {
  getMyNotifications: async (limit = 30): Promise<{ success: boolean; data: NotificationItem[]; unread_count: number }> => {
    const res = await fetch(`${config.baseURL}/notifications?limit=${limit}`, {
      headers: getAuthHeader(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi tải thông báo');
    return json;
  },

  markAsRead: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`${config.baseURL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeader(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi cập nhật');
    return json;
  },

  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const res = await fetch(`${config.baseURL}/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeader(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi cập nhật');
    return json;
  },
};

import { getApiConfig } from './apiConfig';

const config = getApiConfig();

interface NotificationRequestOptions {
  token?: string;
  signal?: AbortSignal;
}

const getAuthHeader = (token = localStorage.getItem('token')) => ({
  ...config.headers,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

async function readResponse<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message || fallback);
  return json;
}

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
  getMyNotifications: async (limit = 30, options: NotificationRequestOptions = {}): Promise<{ success: boolean; data: NotificationItem[]; unread_count: number }> => {
    const res = await fetch(`${config.baseURL}/notifications?limit=${limit}`, {
      headers: getAuthHeader(options.token),
      signal: options.signal,
    });
    const result = await readResponse<{ success: boolean; data: NotificationItem[]; unread_count: number }>(res, 'Không tải được thông báo. Vui lòng thử lại.');
    if (!Array.isArray(result.data) || !Number.isInteger(result.unread_count) || result.unread_count < 0)
      throw new Error('Dữ liệu thông báo chưa hợp lệ. Vui lòng thử lại.');
    return result;
  },

  markAsRead: async (id: number, options: NotificationRequestOptions = {}): Promise<{ success: boolean }> => {
    const res = await fetch(`${config.baseURL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeader(options.token),
      signal: options.signal,
    });
    return readResponse(res, 'Không đánh dấu đã đọc được. Vui lòng thử lại.');
  },

  markAllAsRead: async (options: NotificationRequestOptions = {}): Promise<{ success: boolean }> => {
    const res = await fetch(`${config.baseURL}/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeader(options.token),
      signal: options.signal,
    });
    return readResponse(res, 'Không đánh dấu tất cả đã đọc được. Vui lòng thử lại.');
  },
};

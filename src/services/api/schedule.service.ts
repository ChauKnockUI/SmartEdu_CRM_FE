import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const scheduleService = {
  getAll: async (params?: {
    start_date?: string;
    end_date?: string;
    class_id?: number;
    teacher_id?: number;
    room_id?: number;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.class_id) query.append('class_id', String(params.class_id));
    if (params?.teacher_id) query.append('teacher_id', String(params.teacher_id));
    if (params?.room_id) query.append('room_id', String(params.room_id));
    if (params?.status) query.append('status', params.status);

    const queryString = query.toString();
    const url = queryString ? `${config.baseURL}/schedules?${queryString}` : `${config.baseURL}/schedules`;

    const res = await fetch(url, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getMySchedules: async () => {
    const res = await fetch(`${config.baseURL}/schedules/my/schedules`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getByClass: async (classId: number) => {
    const res = await fetch(`${config.baseURL}/schedules/class/${classId}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/schedules`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  update: async (id: number, data: any) => {
    const res = await fetch(`${config.baseURL}/schedules/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  remove: async (id: number) => {
    const res = await fetch(`${config.baseURL}/schedules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  remindAttendance: async (scheduleId: number) => {
    const res = await fetch(`${config.baseURL}/schedules/${scheduleId}/remind-attendance`, {
      method: 'POST',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi gửi nhắc điểm danh');

    return json;
  },

  remindAllOverdue: async () => {
    const res = await fetch(`${config.baseURL}/schedules/remind-overdue`, {
      method: 'POST',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi nhắc nhở quá hạn');

    return json;
  },
};
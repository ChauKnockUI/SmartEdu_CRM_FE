import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => {
  const token = localStorage.getItem('token');

  return {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
};

export const teacherService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    is_active?: boolean;
  }) => {
    const query = new URLSearchParams();

    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const res = await fetch(`${config.baseURL}/teachers?${query.toString()}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không thể tải danh sách giảng viên');

    return json;
  },

  getById: async (id: number) => {
    const res = await fetch(`${config.baseURL}/teachers/${id}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không thể tải chi tiết giảng viên');

    return json;
  },

  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/teachers`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Tạo giảng viên thất bại');

    return json;
  },

  update: async (id: number, data: any) => {
    const res = await fetch(`${config.baseURL}/teachers/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Cập nhật giảng viên thất bại');

    return json;
  },

  remove: async (id: number) => {
    const res = await fetch(`${config.baseURL}/teachers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Ngưng hoạt động giảng viên thất bại');

    return json;
  },

  resetPassword: async (id: number) => {
    const res = await fetch(`${config.baseURL}/teachers/${id}/reset-password`, {
      method: 'POST',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Khôi phục mật khẩu thất bại');

    return json;
  },

  getSchedule: async (id: number, params?: { start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);

    const res = await fetch(`${config.baseURL}/teachers/${id}/schedule?${query.toString()}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không thể tải lịch dạy');

    return json;
  },
};

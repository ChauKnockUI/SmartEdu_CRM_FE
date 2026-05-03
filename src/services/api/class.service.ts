import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
};

export const classService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    course_id?: number;
    teacher_id?: number;
    room_id?: number;
  }) => {
    const query = new URLSearchParams(params as any).toString();

    const res = await fetch(`${config.baseURL}/classes?${query}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getById: async (id: number) => {
    const res = await fetch(`${config.baseURL}/classes/${id}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/classes`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  update: async (id: number, data: any) => {
    const res = await fetch(`${config.baseURL}/classes/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  remove: async (id: number) => {
    const res = await fetch(`${config.baseURL}/classes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },
};
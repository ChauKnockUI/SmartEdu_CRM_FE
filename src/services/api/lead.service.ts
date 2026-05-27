import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
};

const buildQuery = (params?: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

const request = async (endpoint: string, options?: RequestInit) => {
  const res = await fetch(`${config.baseURL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...(options?.headers || {}),
    },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
};

export const leadService = {
  getAll: async (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/leads${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => request(`/leads/${id}`),

  getActivities: async (id: string) => request(`/leads/${id}/activities`),

  createActivity: async (id: string, data: any) =>
    request(`/leads/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  create: async (data: any) =>
    request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: async (id: string, data: any) =>
    request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: async (id: string) =>
    request(`/leads/${id}`, {
      method: 'DELETE',
    }),

  convert: async (id: number, data?: { email?: string }) =>
    request(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  score: async (id: number) =>
    request(`/leads/${id}/score`, {
      method: 'POST',
    }),
};

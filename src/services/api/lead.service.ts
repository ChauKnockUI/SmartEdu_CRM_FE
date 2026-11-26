import { apiFetch } from './listCache';
import { getApiConfig } from './apiConfig';

export interface LeadSourceOption {
  value: string;
  label: string;
  legacy: boolean;
}

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
  const res = await apiFetch(`${config.baseURL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...(options?.headers || {}),
    },
  });

  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || 'Request failed'), {
    status: res.status,
    duplicateFields: json.duplicate_fields,
    deliveryUnknown: json.delivery_unknown === true,
  });
  return json;
};

export const leadService = {
  getEmailConfiguration: async (): Promise<{ data: { available: boolean; from?: string } }> => request('/leads/email-config'),

  sendEmail: async (id: number, data: { to: string; subject: string; text: string; request_id: string }) =>
    request(`/leads/${id}/emails`, { method: 'POST', body: JSON.stringify(data) }),

  getSources: async (): Promise<{ success: boolean; data: LeadSourceOption[] }> => request('/leads/sources'),

  getAll: async (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/leads${query ? `?${query}` : ''}`);
  },

  getFunnel: async (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/leads/funnel${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => request(`/leads/${id}`),

  getActivities: async (id: string, params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/leads/${id}/activities${query ? `?${query}` : ''}`);
  },

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

  convert: async (id: number, data?: { email?: string; class_id?: number }) =>
    request(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  score: async (id: number) =>
    request(`/leads/${id}/score`, {
      method: 'POST',
    }),
};

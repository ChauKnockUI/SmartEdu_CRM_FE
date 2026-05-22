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

export const financeService = {
  getInvoices: (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/invoices${query ? `?${query}` : ''}`);
  },

  getInvoiceById: (id: number) => request(`/invoices/${id}`),

  createInvoice: (data: any) =>
    request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordPayment: (invoiceId: number, data: any) =>
    request(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelInvoice: (invoiceId: number, notes?: string) =>
    request(`/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  getStudentInvoices: (studentId: number) => request(`/students/${studentId}/invoices`),

  getDebts: () => request('/finance/debts'),

  getRevenueSummary: (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/finance/revenue-summary${query ? `?${query}` : ''}`);
  },
};

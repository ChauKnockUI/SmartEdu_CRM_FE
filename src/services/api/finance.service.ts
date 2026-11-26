import { apiFetch } from './listCache';
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
  const res = await apiFetch(`${config.baseURL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...(options?.headers || {}),
    },
  });

  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || 'Request failed'), { status: res.status });
  return json;
};

async function readAllPages(fetchPage: (page: number) => Promise<any>) {
  const first = await fetchPage(1);
  let data = first.data || [];
  const pages = Math.ceil((first.pagination?.total || 0) / (first.pagination?.limit || 100));
  for (let page = 2; page <= pages; page++) {
    const next = await fetchPage(page);
    data = data.concat(next.data || []);
  }
  return { ...first, data };
}

export const financeService = {
  getAllInvoices: (params?: Record<string, unknown>) => readAllPages(page => financeService.getInvoices({ ...params, page, limit: 100 })),
  getInvoices: (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/invoices${query ? `?${query}` : ''}`);
  },

  getInvoiceById: (id: number, signal?: AbortSignal) => request(`/invoices/${id}`, { signal }),

  getReceipt: (invoiceId: number, receiptId: number) => request(`/invoices/${invoiceId}/receipts/${receiptId}`),

  createInvoice: (data: any) =>
    request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createInvoiceFromClass: (data: any) =>
    request('/invoices/from-class', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createInvoicesForClass: (data: any) =>
    request('/invoices/bulk-class', {
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

  getStudentInvoices: (studentId: number, signal?: AbortSignal) => readAllPages(page => request(`/students/${studentId}/invoices?page=${page}&limit=100`, { signal })),

  getDebts: () => request('/finance/debts'),

  getClassFeeTemplate: (classId: number) => request(`/finance/classes/${classId}/fee-template`),

  getRevenueSummary: (params?: Record<string, unknown>) => {
    const query = buildQuery(params);
    return request(`/finance/revenue-summary${query ? `?${query}` : ''}`);
  },
};

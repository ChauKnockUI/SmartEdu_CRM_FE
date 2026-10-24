// Client cho /api/platform/* (xem SmartEdu_CRM_BE/docs/platform-api.md).
// Token riêng (scope=platform, 8 giờ) lưu ở khóa khác với token của trung tâm.

const BASE = '/api/platform';
const TOKEN_KEY = 'smartedu_platform_token';

export type TenantStatus = 'trial' | 'active' | 'suspended' | 'closed';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired';

export interface PlanRef { id: number; code: string; name: string }

export interface Plan extends PlanRef {
  price_monthly: string | number; // Decimal -> chuỗi
  max_students: number | null;
  max_users: number | null;
  features: unknown;
  is_active: boolean;
  createdAt: string;
}

export interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  status: TenantStatus;
  plan_id: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  trial_ends_at: string | null;
  createdAt: string;
  updatedAt: string;
  plan?: PlanRef | null;
}

export interface Subscription {
  id: number;
  tenant_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  amount: string | number;
  period_start: string;
  period_end: string;
  plan?: PlanRef;
}

export interface TenantDetail {
  tenant: Tenant & { plan: Plan | null };
  usage: {
    users: number; students: number; teachers: number; leads: number; classes: number;
    limits: { max_users: number | null; max_students: number | null };
  };
  currentSubscription: Subscription | null;
}

export interface TenantUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  createdAt: string;
}

export interface PlatformAdmin { id: number; email: string; full_name: string; is_active?: boolean; createdAt?: string }

export interface Stats {
  tenants: {
    total: number;
    byStatus: Partial<Record<TenantStatus, number>>;
    newThisWeek: number;
    trialExpired: number;
  };
  revenue: { mrr: number; thisMonth: number };
  expiringSoon: {
    windowDays: number;
    subscriptions: { tenant: { id: number; name: string; subdomain: string }; plan_id: number; period_end: string }[];
    trials: { id: number; name: string; subdomain: string; trial_ends_at: string }[];
  };
  planDistribution: { plan_id: number | null; code: string | null; name: string | null; count: number }[];
  totalUsers: number;
}

export class PlatformApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const tokenStore = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* bỏ qua */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* bỏ qua */ } },
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

type Query = Record<string, string | number | undefined | null>;

async function request<T>(method: string, path: string, opts: { body?: unknown; query?: Query; auth?: boolean } = {}): Promise<T> {
  const { body, query, auth = true } = opts;
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url.toString(), { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new PlatformApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }

  let json: any = null;
  try { json = await res.json(); } catch { /* không phải JSON */ }

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    const message =
      res.status === 429 ? 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.'
      : json?.message || `Lỗi ${res.status}`;
    throw new PlatformApiError(res.status, message);
  }
  return (json?.data !== undefined ? json.data : json) as T;
}

const get = <T,>(p: string, query?: Query) => request<T>('GET', p, { query });
const post = <T,>(p: string, body?: unknown, auth = true) => request<T>('POST', p, { body: body ?? {}, auth });
const put = <T,>(p: string, body: unknown) => request<T>('PUT', p, { body });

export const api = {
  login: (email: string, password: string) =>
    post<{ token: string; admin: PlatformAdmin }>('/auth/login', { email, password }, false),
  me: () => get<PlatformAdmin>('/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    post<unknown>('/auth/change-password', { current_password, new_password }),

  stats: () => get<Stats>('/stats'),

  tenants: (q: { page?: number; limit?: number; search?: string; status?: string }) =>
    get<{ items: Tenant[]; total: number; page: number; limit: number }>('/tenants', q),
  tenant: (id: number) => get<TenantDetail>(`/tenants/${id}`),
  checkSubdomain: (subdomain: string) =>
    get<{ available: boolean; reason?: string }>('/tenants/check-subdomain', { subdomain }),
  createTenant: (input: {
    name: string; subdomain: string; plan_id?: number; contact_email?: string; contact_phone?: string;
    admin: { email: string; password: string; full_name: string };
  }) => post<{ tenant: Tenant; admin: { id: number; email: string; full_name: string } }>('/tenants', input),
  updateTenant: (id: number, input: { name?: string; contact_email?: string | null; contact_phone?: string | null }) =>
    put<Tenant>(`/tenants/${id}`, input),
  setTenantStatus: (id: number, status: TenantStatus) => put<Tenant>(`/tenants/${id}/status`, { status }),
  subscriptions: (id: number) => get<Subscription[]>(`/tenants/${id}/subscriptions`),
  changePlan: (id: number, plan_id: number, months: number) =>
    post<unknown>(`/tenants/${id}/subscription`, { plan_id, months }),
  extend: (id: number, days: number) => post<unknown>(`/tenants/${id}/extend`, { days }),

  tenantUsers: (id: number, role?: string) => get<TenantUser[]>(`/tenants/${id}/users`, { role }),
  setTenantUserActive: (id: number, userId: number, is_active: boolean) =>
    put<unknown>(`/tenants/${id}/users/${userId}`, { is_active }),
  resetTenantUserPassword: (id: number, userId: number, password?: string) =>
    post<{ password: string; generated: boolean }>(`/tenants/${id}/users/${userId}/reset-password`, password ? { password } : {}),

  plans: () => get<Plan[]>('/plans'),
  createPlan: (input: PlanInput) => post<Plan>('/plans', input),
  updatePlan: (id: number, input: Partial<PlanInput>) => put<Plan>(`/plans/${id}`, input),

  admins: () => get<PlatformAdmin[]>('/admins'),
  createAdmin: (input: { email: string; password: string; full_name: string }) =>
    post<PlatformAdmin>('/admins', input),
  updateAdmin: (id: number, input: { full_name?: string; is_active?: boolean }) =>
    put<PlatformAdmin>(`/admins/${id}`, input),
};

export interface PlanInput {
  code: string;
  name: string;
  price_monthly: number;
  max_students?: number | null;
  max_users?: number | null;
  features?: unknown;
  is_active?: boolean;
}

/** Giây còn lại của JWT (không xác minh chữ ký, chỉ để hiển thị). */
export function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch { return null; }
}

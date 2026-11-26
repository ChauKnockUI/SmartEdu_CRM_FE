import { getApiConfig } from './apiConfig';

export interface EmailSettings {
  sender_name: string;
  sender_email: string;
  has_password: boolean;
  storage_ready: boolean;
  checked_at: string | null;
  updated_at: string | null;
}
export interface EmailSettingsInput {
  sender_name: string; sender_email: string; app_password?: string; updated_at: string | null;
}
const config = getApiConfig();
async function request(method: 'GET' | 'PUT', signal?: AbortSignal, data?: EmailSettingsInput): Promise<EmailSettings> {
  const response = await fetch(`${config.baseURL}/settings/email`, {
    method, signal, cache: 'no-store',
    headers: { ...config.headers, Authorization: `Bearer ${localStorage.getItem('token')}` },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Không tải hoặc lưu được cấu hình email.');
  return result.data;
}
export const emailSettingsService = {
  get: (signal?: AbortSignal) => request('GET', signal),
  save: (data: EmailSettingsInput, signal?: AbortSignal) => request('PUT', signal, data),
};

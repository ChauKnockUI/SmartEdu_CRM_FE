import type { TenantStatus } from './api';

const DAY = 86_400_000;

const nf = new Intl.NumberFormat('vi-VN');
export const num = (n: number | string | null | undefined): string => nf.format(Number(n ?? 0));
export const toNumber = (v: string | number | null | undefined): number => Number(v ?? 0);

const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const fmtDate = (iso?: string | null): string => (iso ? dateFmt.format(new Date(iso)) : '—');
export const fmtDayMonth = (d: Date): string => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
export const fmtDateTime = (iso?: string | null): string => (iso ? dateTimeFmt.format(new Date(iso)) : '—');

/** Số ngày làm tròn lên từ bây giờ đến `iso` (âm nếu đã qua). */
export const daysUntil = (iso: string, now = Date.now()): number => Math.ceil((new Date(iso).getTime() - now) / DAY);

export const daysLabel = (d: number): string =>
  d > 1 ? `còn ${d} ngày` : d === 1 ? 'còn 1 ngày' : d === 0 ? 'hết hạn hôm nay' : `quá hạn ${-d} ngày`;

export const STATUS_LABEL: Record<TenantStatus, string> = {
  trial: 'Dùng thử',
  active: 'Đang hoạt động',
  suspended: 'Tạm ngưng',
  closed: 'Đã đóng',
};

export const STATUS_COLOR: Record<TenantStatus, string> = {
  active: '#23a26d',
  trial: '#b8790a',
  suspended: '#d9454c',
  closed: '#98a2b3',
};

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị',
  sale: 'Tư vấn',
  teacher: 'Giáo viên',
  student: 'Học viên',
};

export const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Đang chạy',
  past_due: 'Quá hạn thanh toán',
  cancelled: 'Đã hủy',
  expired: 'Đã hết hạn',
};

/** Pha màu nhạt ổn định theo chuỗi, dùng cho avatar (nhận diện, không phải dữ liệu). */
const HUES = [205, 168, 32, 145, 350, 190, 18, 95];
export function tint(seed: string): { background: string; color: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = HUES[h % HUES.length];
  return { background: `hsl(${hue} 62% 93%)`, color: `hsl(${hue} 52% 27%)` };
}

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const pick = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? '?'];
  return pick.join('').toUpperCase();
};

/** Tên miền gốc của nền tảng, suy ra từ host quản trị (admin.smartedu.vn -> smartedu.vn). */
export const baseDomain = (): string => {
  const host = window.location.host;
  return host.startsWith('admin.') ? host.slice(6) : host;
};

export const tenantUrl = (subdomain: string): string =>
  `${window.location.protocol}//${subdomain}.${baseDomain()}`;

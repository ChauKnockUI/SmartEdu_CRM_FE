export interface NavigationContext { from?: string; menuKey?: string; classId?: number }

export const SECTION_PATHS = ['/dashboard', '/crm/leads', '/lms/students', '/lms/teachers', '/lms/courses',
  '/lms/rooms', '/lms/classes', '/lms/schedule', '/lms/myschedule', '/lms/scheduling',
  '/finance/invoices', '/finance/payments', '/finance/debts', '/ai/models', '/ai/predictions', '/ai/insights', '/settings/users'];

export const isDetailPath = (pathname: string) => /^\/(?:lms\/(?:classes|students|sessions|courses|rooms|teachers)|crm\/leads)\/[^/]+\/?$/.test(pathname);

export function activeMenuKey(pathname: string, available: string[], hint?: string) {
  // Student/session screens opened from a class remain in that working context.
  if (/^\/lms\/(?:students|sessions)\/[^/]+\/?$/.test(pathname) && hint && available.includes(hint)) return hint;
  const matching = available.filter(key => pathname === key || pathname.startsWith(`${key}/`));
  if (matching.length) return matching.sort((a, b) => b.length - a.length)[0];
  if (/^\/lms\/(?:sessions|students)\//.test(pathname) && available.includes('/lms/classes')) return '/lms/classes';
  return available.includes('/dashboard') ? '/dashboard' : available[0] || '/dashboard';
}

export function backTarget(historyIndex: number | undefined, pathname: string, from?: string): number | string {
  if (typeof historyIndex === 'number' && historyIndex > 0) return -1;
  if (from?.startsWith('/') && !from.startsWith('//') && from.split('?')[0] !== pathname) return from;
  return activeMenuKey(pathname, SECTION_PATHS);
}

export function classTab(value: string | null) {
  return value && ['overview', 'students', 'sessions', 'materials'].includes(value) ? value : 'overview';
}

export function navigationClassId(pathname: string, context?: NavigationContext | null) {
  const match = pathname.match(/^\/lms\/classes\/(\d+)\/?$/)
    || context?.from?.split('?')[0].match(/^\/lms\/classes\/(\d+)\/?$/);
  const id = match ? Number(match[1]) : context?.classId;
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

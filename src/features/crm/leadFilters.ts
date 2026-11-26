import dayjs from 'dayjs';
import { LEAD_STATUSES } from './leadStatus';

export type LeadViewMode = 'pipeline' | 'table' | 'funnel';
export const LEAD_CARE_OPTIONS = [
  { value: 'needs_care', label: 'Cần chăm sóc' },
  { value: 'unassigned', label: 'Chưa phân công' },
  { value: 'never_contacted', label: 'Chưa từng liên hệ' },
  { value: 'follow_up', label: 'Cần liên hệ lại (>3 ngày)' },
];
const positiveId = (value: string | null) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
};

export function readLeadLocation(params: URLSearchParams) {
  const filters: Record<string, any> = {};
  const status = params.get('status');
  if (status && LEAD_STATUSES.some(stage => stage.value === status)) filters.status = status;
  for (const key of ['source', 'search']) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }
  const courseId = positiveId(params.get('course_id'));
  if (courseId) filters.course_id = courseId;
  const assigned = params.get('assigned_to');
  if (assigned === 'unassigned') filters.assigned_to = assigned;
  else if (positiveId(assigned)) filters.assigned_to = positiveId(assigned);
  if (params.get('needs_care') === 'true') filters.needs_care = true;
  const care = params.get('care');
  if (LEAD_CARE_OPTIONS.some(item => item.value !== 'needs_care' && item.value === care)) {
    filters.care = care;
    delete filters.needs_care;
  }
  const from = params.get('date_from');
  const to = params.get('date_to');
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
    && dayjs(from).format('YYYY-MM-DD') === from && dayjs(to).format('YYYY-MM-DD') === to && from <= to) {
    filters.dateRange = [dayjs(from), dayjs(to)];
  }
  const tab = params.get('tab');
  const viewMode: LeadViewMode = tab === 'table' || tab === 'funnel' ? tab : 'pipeline';
  return { filters, viewMode };
}

export function writeLeadLocation(filters: Record<string, any>, viewMode: LeadViewMode) {
  const params = new URLSearchParams();
  for (const key of ['status', 'source', 'course_id', 'assigned_to', 'search', 'care']) {
    if (filters[key] !== undefined && filters[key] !== '') params.set(key, String(filters[key]));
  }
  if (filters.needs_care) params.set('needs_care', 'true');
  if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
    params.set('date_from', filters.dateRange[0].format('YYYY-MM-DD'));
    params.set('date_to', filters.dateRange[1].format('YYYY-MM-DD'));
  }
  if (viewMode !== 'pipeline') params.set('tab', viewMode);
  return params;
}

export function leadNeedsCare(lead: any, now = Date.now()) {
  return ['new', 'contacted', 'interested', 'trial'].includes(lead.status)
    && (!lead.last_contacted || now - dayjs(lead.last_contacted).valueOf() > 3 * 86_400_000);
}

export function getLeadCareState(lead: any, now = Date.now()) {
  if (['enrolled', 'lost'].includes(lead.status)) return null;
  const reason = !lead.assigned_to ? 'Chưa phân công' : !lead.last_contacted ? 'Chưa từng liên hệ'
    : leadNeedsCare(lead, now) ? 'Cần liên hệ lại' : '';
  if (!reason) return null;
  const since = !lead.assigned_to || !lead.last_contacted ? lead.createdAt : lead.last_contacted;
  const elapsed = since ? now - dayjs(since).valueOf() : NaN;
  const waiting = Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 86_400_000)) : null;
  return { reason, since, waiting };
}

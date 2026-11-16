import dayjs from 'dayjs';
import { LEAD_STATUSES } from './leadStatus';

export type LeadViewMode = 'pipeline' | 'table' | 'funnel';
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
  for (const key of ['status', 'source', 'course_id', 'assigned_to', 'search']) {
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

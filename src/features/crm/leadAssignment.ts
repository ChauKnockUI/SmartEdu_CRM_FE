import { getLeadStatus } from './leadStatus';

export const LEAD_ASSIGNMENT_REQUIRED = 'Vui lòng phân công Sale phụ trách trước khi tiếp tục chăm sóc Lead.';

export function hasLeadAssignee(lead: any) {
  return Boolean(lead?.assigned_to && lead.assignedUser?.role === 'sale' && lead.assignedUser?.is_active !== false);
}

export function requiresLeadAssignee(status: string) {
  return ['contacted', 'interested', 'trial', 'enrolled'].includes(status);
}

export function canUnassignLead(lead: any) {
  return !['contacted', 'interested', 'trial'].includes(lead?.status);
}

export function leadContactBlockReason(lead: any) {
  if (['enrolled', 'lost'].includes(lead?.status)) return 'Lead đã kết thúc quy trình. Bạn vẫn có thể thêm ghi chú nội bộ.';
  if (!hasLeadAssignee(lead)) return LEAD_ASSIGNMENT_REQUIRED;
  return undefined;
}

export function leadConvertBlockReason(lead: any) {
  if (lead?.status === 'enrolled') return 'Lead đã được chuyển thành học viên.';
  if (lead?.status === 'lost') return 'Lead đã thất bại. Hãy mở lại Lead trước khi chuyển thành học viên.';
  if (!hasLeadAssignee(lead)) return LEAD_ASSIGNMENT_REQUIRED;
  if (!lead.email?.trim()) return 'Vui lòng bổ sung email trước khi chuyển thành học viên.';
  return undefined;
}

export function leadTransitionBlockReason(lead: any, target: string) {
  if (lead?.status === 'enrolled') return 'Lead đã đăng ký, không thể thay đổi giai đoạn.';
  if (target === 'enrolled') return leadConvertBlockReason(lead);
  if (requiresLeadAssignee(target) && !hasLeadAssignee(lead)) return LEAD_ASSIGNMENT_REQUIRED;
  if (!getLeadStatus(target)) return 'Giai đoạn không hợp lệ.';
  return undefined;
}

export function getLeadAssigneeOptions(sales: any[], lead?: any) {
  const options: { value: number; label: string; disabled?: boolean }[] = [
    { value: 0, label: 'Chưa phân công', ...(!canUnassignLead(lead) ? { disabled: true } : {}) },
    ...sales.map(sale => ({ value: sale.id, label: `${sale.full_name} (${sale.email})` })),
  ];
  if (lead?.assigned_to && !sales.some(sale => sale.id === lead.assigned_to)) {
    options.push({ value: lead.assigned_to, disabled: true,
      label: `${lead.assignedUser?.full_name || `Sale #${lead.assigned_to}`} (không còn nhận phân công)` });
  }
  return options;
}


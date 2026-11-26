export const LEAD_STATUSES = [
  { value: 'new', label: 'Mới tiếp nhận', color: 'blue', hex: '#1677ff' },
  { value: 'contacted', label: 'Đã liên hệ', color: 'cyan', hex: '#13c2c2' },
  { value: 'interested', label: 'Quan tâm', color: 'gold', hex: '#faad14' },
  { value: 'trial', label: 'Học thử', color: 'purple', hex: '#722ed1' },
  { value: 'enrolled', label: 'Đã đăng ký', color: 'green', hex: '#52c41a' },
  { value: 'lost', label: 'Thất bại', color: 'red', hex: '#f5222d' },
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number]['value'];
export const LEAD_OPEN_STAGES = LEAD_STATUSES.filter(stage => stage.value !== 'lost');
export const getLeadStatus = (value: string) => LEAD_STATUSES.find(stage => stage.value === value);

export const LEAD_ACTIVITY_LABELS: Record<string, string> = {
  call: 'Gọi điện', email: 'Email', sms: 'SMS', meeting: 'Tư vấn trực tiếp',
  note: 'Ghi chú', status_change: 'Cập nhật giai đoạn',
};

export const LEAD_ACTIONS = {
  contact: 'Ghi nhận kết quả', convert: 'Chuyển thành học viên', lost: 'Đánh dấu thất bại', assign: 'Phân công sale',
};
export const LEAD_MESSAGES = {
  created: 'Đã tạo Lead', updated: 'Đã cập nhật thông tin Lead', stageUpdated: 'Đã cập nhật giai đoạn Lead',
  converted: 'Đã chuyển Lead thành học viên', contactSaved: 'Đã ghi nhận liên hệ', noteSaved: 'Đã lưu ghi chú',
  assigned: 'Đã cập nhật người phụ trách Lead', unassigned: 'Đã bỏ phân công Lead', deleted: 'Đã xóa Lead',
  updateFailed: 'Không cập nhật được thông tin Lead', stageFailed: 'Không cập nhật được giai đoạn Lead',
  convertFailed: 'Không chuyển được Lead thành học viên', assignFailed: 'Không cập nhật được người phụ trách Lead',
  contactFailed: 'Không lưu được lịch sử chăm sóc', deleteFailed: 'Không xóa được Lead',
  createFailed: 'Không tạo được Lead',
};

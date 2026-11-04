export type SupportLevel = 'low' | 'medium' | 'high';
export interface DropoutRiskView {
  risk_score?: number | null;
  risk_level?: SupportLevel | null;
  top_reasons?: string[] | null;
  evaluated_at?: string | null;
  model_status?: string | null;
  limited_data?: boolean;
  action?: string;
  class_id?: number;
  student_id?: number;
  score_type?: string;
  academic_score?: number | null;
  model_score?: number | null;
  model_includes_finance?: boolean;
  evidence?: {
    attendance: { attended: number; recorded: number; absent: number; consecutive: number };
    tuition: { known?: boolean; overdue_days: number; overdue_count: number; paid_late_days: number };
    model?: { flagged: boolean; includes_finance: boolean };
    academic: { flagged: boolean; passed: number; assessed: number; scored: number };
  } | null;
  hybrid?: {
    version: string;
    base_score: number | null;
    minimum_score: number;
    minimum_reasons: string[];
    available_components: number;
    total_components?: number;
    missing_components: string[];
    components: Array<{ key: string; label: string; score: number | null; weight: number;
      effective_weight: number; contribution: number | null }>;
  } | null;
}

export const supportLevels = {
  high: { label: 'Cần liên hệ', color: 'red', order: 3 },
  medium: { label: 'Cần theo dõi', color: 'orange', order: 2 },
  low: { label: 'Chưa có cảnh báo', color: 'green', order: 1 },
} as const;

export function riskAvailability(data?: DropoutRiskView) {
  if (data?.score_type === 'academic_legacy') return 'legacy';
  if (typeof data?.risk_score === 'number' && Number.isFinite(data.risk_score)) return 'scored';
  if (data?.model_status === 'unavailable' || data?.top_reasons?.some(reason => /tạm không sẵn sàng/i.test(reason))) return 'unavailable';
  if (data?.evaluated_at || data?.model_status || data?.risk_level) return 'insufficient';
  return 'unassessed';
}

export function studentRiskView(student: {
  dropout_risk?: number | null; dropout_risk_level?: SupportLevel | null;
  dropout_risk_reasons?: string[] | null; dropout_risk_updated_at?: string | null;
  dropout_risk_type?: string;
  dropout_risk_details?: DropoutRiskView | null;
}): DropoutRiskView {
  return { risk_score: student.dropout_risk, risk_level: student.dropout_risk_level,
    top_reasons: student.dropout_risk_reasons, evaluated_at: student.dropout_risk_updated_at,
    limited_data: student.dropout_risk_reasons?.some(reason => reason.startsWith('Ước tính sớm')),
    score_type: student.dropout_risk_type || (student.dropout_risk != null ? 'academic_legacy' : undefined),
    ...student.dropout_risk_details };
}

export function warningReasons(data?: DropoutRiskView) {
  return (data?.top_reasons || [])
    .filter(reason => !/^(\[(Tổng hợp|Dữ liệu)\]|Chưa có|Chưa đủ|Chưa đến mốc|Model tạm|Model học tập(?: và học phí)? chưa|Ước tính sớm)/i.test(reason))
    .map(reason => {
      if (reason.startsWith('[Model học tập]')) {
        const facts = reason.match(/Dữ liệu: ([^.]+)/)?.[1];
        return facts ? `Học tập: ${facts}.` : 'Kết quả học tập cần được xem xét.';
      }
      if (reason.startsWith('[Chuyên cần]')) {
        const consecutive = Number(reason.match(/liên tiếp (\d+) buổi/)?.[1] || 0);
        if (consecutive >= 2) return `Vắng không phép ${consecutive} buổi liên tiếp.`;
      }
      return reason.replace(/^\[[^\]]+\]\s*/, '');
    }).slice(0, 3);
}

export function supportOrder(data?: DropoutRiskView) {
  return data?.risk_level ? supportLevels[data.risk_level]?.order || 0 : 0;
}

export function riskHighlights(data?: DropoutRiskView) {
  if (!data?.evidence) return warningReasons(data);
  const { attendance, tuition, academic } = data.evidence;
  const facts: string[] = [];
  if (data.evidence.model?.flagged && data.evidence.model.includes_finance) facts.push('AI học tập và học phí cần theo dõi');
  if (attendance.consecutive >= 2) facts.push(`Vắng ${attendance.consecutive} buổi liên tiếp`);
  if (tuition.overdue_days > 0) facts.push(`Học phí quá hạn ${tuition.overdue_days} ngày`);
  if (academic.flagged && academic.assessed > 0) facts.push(`Đạt ${academic.passed}/${academic.assessed} bài đánh giá`);
  if (attendance.absent > 0 && attendance.consecutive < 2 && attendance.recorded > 0) {
    facts.push(`Tham gia ${attendance.attended}/${attendance.recorded} buổi`);
  }
  if (!tuition.overdue_days && tuition.paid_late_days > 0) facts.push(`Đã đóng học phí trễ ${tuition.paid_late_days} ngày`);
  if (!facts.length && attendance.recorded > 0) facts.push(`Tham gia ${attendance.attended}/${attendance.recorded} buổi`);
  if (!facts.length && academic.scored > 0) facts.push(`Đạt ${academic.passed}/${academic.assessed} bài đánh giá`);
  return facts.slice(0, 3);
}

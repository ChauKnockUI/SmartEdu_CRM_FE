import { Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getLeadGuidance } from '../leadGuidance';
import { LeadCareSummary } from './LeadCareSummary';

export function LeadConsultationPanel({ lead, activities, onScore, loading }: {
  lead: any; activities: any[]; onScore: () => void; loading: boolean;
}) {
  const guidance = getLeadGuidance(lead, activities);
  const basis = lead.aiAssessment?.assessment_basis;
  const description = basis === 'profile_only' ? 'Nguồn, nghề nghiệp và mục tiêu học.'
    : basis === 'response_pending' ? 'Hồ sơ ban đầu; chưa có kết quả liên hệ để bổ sung.'
    : basis === 'profile_and_response' ? 'Hồ sơ ban đầu và phản hồi đã ghi nhận.'
    : basis === 'crm_history' ? 'Thông tin lead và lịch sử chăm sóc đã ghi nhận.'
    : 'Cần cập nhật đánh giá để xác định dữ liệu đang dùng.';
  return (
    <details className="crm-lead-advice">
      <summary>Gợi ý chăm sóc <span>· {guidance.title}</span></summary>
      <div className="crm-lead-advice-body">
        <p>{guidance.action}</p>
        {guidance.question && <p><strong>Gợi ý trao đổi:</strong> {guidance.question}</p>}
        <p className="text-gray-500">{guidance.reason}</p>
        {!guidance.closed && <div className="crm-lead-advice-score">
          <Space wrap>
            <LeadCareSummary lead={lead} compact />
            <Button type="text" size="small" icon={<ReloadOutlined />} loading={loading} onClick={onScore}>Cập nhật</Button>
          </Space>
          <p>{description}</p>
          <p>Yếu tố kéo điểm lên: {lead.aiScore?.positive_factors?.slice(0, 2).join('; ') || 'Chưa có thông tin giải thích.'}</p>
          <p>Yếu tố kéo điểm xuống: {lead.aiScore?.negative_factors?.slice(0, 2).join('; ') || 'Không có yếu tố nổi bật được trả về.'}</p>
          <p className="text-xs text-gray-400">Đánh giá lúc: {lead.aiScore?.scored_at ? dayjs(lead.aiScore.scored_at).format('DD/MM/YYYY HH:mm') : 'Chưa đánh giá'}. Các yếu tố là liên hệ thống kê, không phải lý do khách chưa đăng ký.</p>
        </div>}
      </div>
    </details>
  );
}

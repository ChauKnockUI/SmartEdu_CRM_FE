import { Button, Card, Col, Collapse, Row } from 'antd';
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
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={15}>
        <Card className="h-full" title="Việc nên làm tiếp theo">
          <h3 className="mb-2 text-base font-semibold text-gray-900">{guidance.title}</h3>
          <p className="text-sm leading-6 text-gray-700">{guidance.action}</p>
          {guidance.question && <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <div className="mb-1 text-xs font-medium text-blue-700">Gợi ý trao đổi</div>
            <p className="text-sm leading-6 text-gray-700">“{guidance.question}”</p>
          </div>}
          <p className="mt-3 text-xs leading-5 text-gray-500">Căn cứ: {guidance.reason}</p>
        </Card>
      </Col>
      <Col xs={24} xl={9}>
        <Card className="h-full" title="Điểm hỗ trợ tư vấn" extra={!guidance.closed && <Button type="text" size="small" icon={<ReloadOutlined />} loading={loading} onClick={onScore}>Cập nhật</Button>}>
          {guidance.closed ? <p className="text-sm text-gray-500">Lead đã kết thúc quy trình chuyển đổi.</p> : <>
            <LeadCareSummary lead={lead} />
            <Collapse ghost size="small" className="mt-3" items={[{
              key: 'explanation', label: 'Vì sao có điểm này?', children: <div className="space-y-3 text-sm text-gray-600">
                <p>{description}</p>
                <div><div className="mb-1 text-xs text-gray-500">Yếu tố kéo điểm lên</div>{lead.aiScore?.positive_factors?.slice(0, 2).join('; ') || 'Chưa có thông tin giải thích.'}</div>
                <div><div className="mb-1 text-xs text-gray-500">Yếu tố kéo điểm xuống</div>{lead.aiScore?.negative_factors?.slice(0, 2).join('; ') || 'Không có yếu tố nổi bật được trả về.'}</div>
                <p className="text-xs text-gray-400">Đánh giá lúc: {lead.aiScore?.scored_at ? dayjs(lead.aiScore.scored_at).format('DD/MM/YYYY HH:mm') : 'Chưa đánh giá'}. Các yếu tố là liên hệ thống kê, không phải lý do khách chưa đăng ký.</p>
              </div>,
            }]} />
          </>}
        </Card>
      </Col>
    </Row>
  );
}

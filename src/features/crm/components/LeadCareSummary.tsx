import { Space, Tag, Tooltip } from 'antd';
import { getLeadAssessmentLabel, getLeadScore, getScoreTagColor } from '../leadScore';

export function LeadCareSummary({ lead, compact = false }: { lead: any; compact?: boolean }) {
  const assessment = lead?.aiAssessment;
  const closed = ['enrolled', 'lost'].includes(lead?.status);
  const score = closed ? null : getLeadScore(lead);
  const fresh = assessment?.model_status === 'scored';
  return (
    <Space orientation="vertical" size={compact ? 2 : 8} className="w-full">
      <Space wrap size={4}>
        {!closed && (
          <Tooltip title={score === null ? 'Đánh giá lead để bổ sung điểm chuyển đổi.'
            : fresh ? `${getLeadAssessmentLabel(lead)}. Điểm mô hình tham khảo, chưa phải tỷ lệ đăng ký đã kiểm chứng tại trung tâm.` : 'Điểm lần trước; cần cập nhật đánh giá.'}>
            <Tag color={getScoreTagColor(score)}>
              {score === null ? 'Chưa có điểm' : `${score}%${fresh ? '' : ' · lần trước'}`}
            </Tag>
          </Tooltip>
        )}
      </Space>
      {compact && fresh && !closed && <span className="text-[11px] text-gray-400">{assessment?.scoring_stage === 'initial' ? 'Ban đầu' : assessment?.assessment_basis === 'response_pending' ? 'Chờ phản hồi' : 'Sau tương tác'}</span>}
      {!compact && !closed && (
        <div className="text-xs text-gray-500">
          {fresh && <div>{getLeadAssessmentLabel(lead)}</div>}
          {assessment?.model_status === 'unavailable' ? 'AI tạm chưa sẵn sàng; đang hiển thị điểm lần trước nếu có.'
            : assessment?.model_status === 'stale' ? 'Thông tin vừa thay đổi; cần đánh giá lại.'
            : assessment?.score_type === 'crm_conversion_probability' ? 'Ước tính chuyển đổi trong 30 ngày.'
            : 'Điểm tham khảo; xác nhận nhu cầu qua tư vấn trước khi hướng dẫn đăng ký.'}
        </div>
      )}
    </Space>
  );
}

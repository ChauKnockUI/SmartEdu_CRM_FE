import { Button, Drawer, Space, Tag, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { riskAvailability, supportLevels, riskHighlights, type DropoutRiskView } from '../utils/dropoutRisk';

export const riskTime = (date?: string | null) => date ? new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa đánh giá';

export function SupportPriority({ data }: { data?: DropoutRiskView }) {
  const level = data?.risk_level ? supportLevels[data.risk_level] : null;
  return level ? <Tag color={level.color}>{level.label}</Tag>
    : <Tag>{riskAvailability(data) === 'unassessed' ? 'Chưa đánh giá' : 'Chưa xác định'}</Tag>;
}

export function RiskEstimate({ data, showReason = true, onOpen }: { data?: DropoutRiskView; showReason?: boolean; onOpen?: () => void }) {
  const state = riskAvailability(data);
  const facts = riskHighlights(data);
  if (state !== 'scored') return <Tooltip title={state === 'legacy' ? 'Kết quả cũ chưa có điểm tổng hợp. Bấm Đánh giá lại để cập nhật.'
    : state === 'unavailable' ? 'Tạm thời chưa tính được. Hãy thử đánh giá lại.'
    : state === 'insufficient' ? 'Cần dữ liệu học tập, điểm danh hoặc hóa đơn để đánh giá.' : 'Bấm Đánh giá để kiểm tra dữ liệu hiện tại.'}>
    {onOpen ? <Button type="link" size="small" style={{ padding: 0 }} onClick={onOpen}>
      {state === 'legacy' ? 'Đánh giá lại' : state === 'unavailable' ? 'Thử lại' : state === 'insufficient' ? 'Chưa đủ dữ liệu' : 'Đánh giá'}
    </Button> : <Typography.Text type="secondary">{state === 'legacy' ? 'Cần đánh giá lại' : state === 'unavailable' ? 'Tạm gián đoạn' : state === 'insufficient' ? 'Chưa đủ dữ liệu' : '—'}</Typography.Text>}
  </Tooltip>;
  return <div><Space size={6} wrap>
    <Tooltip title="Điểm rủi ro 0–100, không phải xác suất đã kiểm chứng.">
      {onOpen ? <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 16,
        color: data?.risk_level === 'high' ? '#cf1322' : data?.risk_level === 'medium' ? '#ad6800' : undefined }}
        onClick={onOpen} aria-label={`Xem đánh giá ${data!.risk_score!.toFixed(1)}% của lớp này`}>{data!.risk_score!.toFixed(1)}%</Button>
        : <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 16 }}>{data!.risk_score!.toFixed(1)}%</span>}
    </Tooltip>
    {!onOpen && (data?.hybrid && data.hybrid.available_components < 3 ? <Tag>Dữ liệu một phần</Tag>
      : data?.limited_data && <Tag>Ước tính sớm</Tag>)}
  </Space>
    {showReason && facts.length > 0 && <div className="mt-1 text-xs text-gray-500" style={{ maxWidth: 230 }}>
      <Tooltip title={facts.join(' · ')}><span>{facts[0]}</span></Tooltip>
      {facts.length > 1 && <Tooltip title={facts.slice(1).join(' · ')}><span className="ml-1 cursor-help text-blue-600">+{facts.length - 1}</span></Tooltip>}
    </div>}
  </div>;
}

export function RiskDetails({ data }: { data?: DropoutRiskView }) {
  const state = riskAvailability(data);
  const reasons = riskHighlights(data);
  const missing = data?.hybrid?.missing_components.map(label => label.replace(/\s*\(AI\)/g, '').toLocaleLowerCase('vi-VN')) || [];
  const nextStep = state !== 'scored' ? 'Cập nhật thông tin và đánh giá lại.'
    : data?.risk_level === 'high' ? 'Liên hệ học viên để tìm hiểu và hỗ trợ.'
    : data?.risk_level === 'medium' ? 'Kiểm tra thông tin và trao đổi với học viên.' : 'Tiếp tục theo dõi.';
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-sm text-gray-500 mb-1">Rủi ro ước tính</div><RiskEstimate data={data} showReason={false} /></div>
      <SupportPriority data={data} />
    </div>
    {state !== 'scored' && <p className="m-0 text-sm text-gray-600">
      {state === 'legacy' ? 'Bấm Đánh giá lại để cập nhật kết quả.'
        : state === 'unavailable' ? 'Chưa tính được kết quả. Vui lòng thử lại.'
        : state === 'unassessed' ? 'Chưa đánh giá học viên ở lớp này. Bấm Đánh giá để kiểm tra.' : 'Cần thêm điểm học tập, điểm danh hoặc thông tin học phí.'}
    </p>}
    {data?.evidence && <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 px-4 text-sm">
      <div className="py-3"><div className="mb-1 text-gray-500">Điểm danh</div>
        {data.evidence.attendance.recorded > 0 ? <>
          <div>Tham gia <strong>{data.evidence.attendance.attended}/{data.evidence.attendance.recorded}</strong> buổi đã điểm danh</div>
          {data.evidence.attendance.absent > 0 && <div className="mt-1 text-gray-500">Vắng không phép {data.evidence.attendance.absent} buổi
            {data.evidence.attendance.consecutive >= 2 ? ` · ${data.evidence.attendance.consecutive} buổi liên tiếp` : ''}</div>}
        </> : <span>Chưa có điểm danh</span>}
      </div>
      <div className="py-3"><div className="mb-1 text-gray-500">Bài tập & kiểm tra</div>
        {data.evidence.academic.assessed > 0 ? <>
          <div>Đạt <strong>{data.evidence.academic.passed}/{data.evidence.academic.assessed}</strong> bài đánh giá</div>
          <div className="mt-1 text-gray-500">Đã có điểm {data.evidence.academic.scored}/{data.evidence.academic.assessed} bài được xét</div>
          {data.evidence.academic.flagged && <div className="mt-1 text-orange-700">Kết quả học tập cần theo dõi.</div>}
        </> : <span>Chưa có bài đánh giá</span>}
      </div>
      <div className="py-3"><div className="mb-1 text-gray-500">Học phí của lớp</div>
        {data.evidence.tuition.overdue_days > 0 ? <span>{data.evidence.tuition.overdue_count} khoản quá hạn <strong>{data.evidence.tuition.overdue_days} ngày</strong></span>
          : data.hybrid?.components.some(part => part.key === 'tuition' && part.score !== null) ? <span>Không có khoản quá hạn</span> : <span>Chưa có thông tin học phí</span>}
        {data.evidence.tuition.paid_late_days > 0 && <div className="mt-1 text-gray-500">Từng đóng trễ {data.evidence.tuition.paid_late_days} ngày</div>}
      </div>
    </div>}
    {state === 'scored' && <div>
      {!data?.evidence && reasons.length > 0 && <ul className="m-0 pl-5 space-y-1 text-sm">{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
      {(missing.length > 0 || data?.model_status === 'unavailable') && <p className="mt-2 mb-0 text-sm text-gray-500">
        {data?.model_status === 'unavailable' ? 'Chưa lấy được kết quả học tập.'
          : `Còn thiếu thông tin ${missing.join(', ')}.`}
      </p>}
    </div>}
    <div className="border-t border-gray-100 pt-3 text-sm">
      <span className="font-medium">Tiếp theo: </span>{nextStep}
    </div>
    {data?.evaluated_at && <div className="text-xs text-gray-400">Cập nhật: {riskTime(data.evaluated_at)}</div>}
  </div>;
}

export function RiskDetailsDrawer({ open, onClose, name, className, data, onProfile, onEvaluate, loading }: {
  open: boolean; onClose: () => void; name?: string; className?: string; data?: DropoutRiskView; onProfile?: () => void;
  onEvaluate?: () => void; loading?: boolean;
}) {
  return <Drawer open={open} onClose={onClose} title="Nguy cơ bỏ học theo lớp" placement="right" size={480}
    extra={onEvaluate ? <Button icon={<ReloadOutlined />} onClick={onEvaluate} loading={loading}>{riskAvailability(data) === 'unassessed' ? 'Đánh giá' : 'Đánh giá lại'}</Button> : undefined}
    footer={onProfile ? <Button type="primary" onClick={onProfile}>Mở hồ sơ học viên</Button> : undefined}>
    <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>{name}</Typography.Title>
    {className && <Typography.Paragraph type="secondary">{className}</Typography.Paragraph>}
    <RiskDetails data={data} />
  </Drawer>;
}

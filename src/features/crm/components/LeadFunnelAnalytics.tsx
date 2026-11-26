import { paginationProps } from '../../../shared/utils/pagination';
import { Alert, Card, Col, Empty, Progress, Row, Table } from 'antd';
import type { LeadSourceOption } from '@/services/api/lead.service';
import { getLeadSourceLabel } from '../leadSources';

interface LeadFunnelAnalyticsProps {
  sourceOptions: LeadSourceOption[];
  data: any;
  loading: boolean;
  userRole?: string;
}

export function LeadFunnelAnalytics({ sourceOptions, data, loading, userRole }: LeadFunnelAnalyticsProps) {
  const summary = data?.summary || {};
  const stages = data?.stages || [];
  const sources = data?.sourcePerformance || [];
  const bestSource = sources.find((source: any) => source.enrolled > 0);
  const advice = userRole === 'admin' && summary.unassignedCount > 0
    ? summary.unassignedCount + ' lead đang chăm sóc chưa có người phụ trách. Phân công rõ để tránh bỏ sót khách.'
    : summary.staleLeadsCount > 0
      ? summary.staleLeadsCount + ' lead chưa có liên hệ hoặc đã quá 3 ngày chưa liên hệ lại. Kiểm tra lịch sử và cập nhật lần tư vấn tiếp theo.'
      : 'Tiếp tục theo sát phản hồi và học thử; xác nhận nhu cầu trước khi hướng dẫn đăng ký.';

  return (
    <div className="space-y-4">
      {data && <Alert type="info" showIcon message={advice} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Lead đang ở giai đoạn nào?" loading={loading}>
            <p className="mb-4 text-xs text-gray-500">Phân bố hiện tại theo trạng thái CRM, không phải lịch sử đi qua từng bước.</p>
            {stages.length ? <div className="space-y-4">{stages.map((stage: any) => (
              <div key={stage.stage}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span>{stage.label}</span>
                  <span className="shrink-0 font-medium">{stage.count} <span className="font-normal text-gray-400">({stage.percentage}%)</span></span>
                </div>
                <Progress percent={stage.percentage} showInfo={false} strokeColor={stage.color} size="small" />
                {stage.staleCount > 0 && <div className="text-xs text-amber-700">{stage.staleCount} lead cần liên hệ lại</div>}
              </div>
            ))}</div> : <Empty description="Chưa có dữ liệu" />}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Nguồn nào có đăng ký?" loading={loading} styles={{ body: { padding: '0 16px 16px' } }}>
            <Table size="small" dataSource={sources} rowKey="source" pagination={sources.length > 6 ? paginationProps('nguồn', { pageSize: 6, showSizeChanger: false }) : false} scroll={{ x: 380 }} columns={[
              { title: 'Nguồn', dataIndex: 'source', render: value => getLeadSourceLabel(value, sourceOptions) },
              { title: 'Lead', dataIndex: 'total', align: 'right' },
              { title: 'Đăng ký', dataIndex: 'enrolled', align: 'right' },
              { title: 'Tỷ lệ', dataIndex: 'conversionRate', align: 'right', render: value => value + '%' },
            ]} />
            <p className="mt-4 text-sm text-gray-600">
              {bestSource ? getLeadSourceLabel(bestSource.source, sourceOptions) + ' có nhiều đăng ký nhất trong phạm vi đang xem: ' + bestSource.enrolled + '/' + bestSource.total + ' lead.' : 'Chưa có đăng ký trong phạm vi đang xem; tiếp tục theo dõi kết quả tư vấn.'}
            </p>
            <p className="mt-2 text-xs text-gray-500">Đối chiếu thêm chi phí và số lượng lead trước khi điều chỉnh ngân sách marketing.</p>
          </Card>
        </Col>
      </Row>
      {data && <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Giá trị cơ hội đang chăm sóc: <span className="font-semibold text-gray-800">{Number(summary.activePipelineValue || 0).toLocaleString('vi-VN')} đ</span>.
        <span className="ml-1 text-xs">Tổng học phí khóa quan tâm; chưa phải doanh thu đã thu.</span>
      </div>}
    </div>
  );
}

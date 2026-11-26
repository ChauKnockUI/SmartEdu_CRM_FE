import { Card, Col, Row, Statistic } from 'antd';

export function LeadOverviewStats({ data, loading = false, manager = false }: { data: any; loading?: boolean; manager?: boolean }) {
  const summary = data?.summary || {};
  const rate = summary.totalLeads ? Math.round(summary.enrolledCount / summary.totalLeads * 1000) / 10 : 0;
  const cards = [
    { title: 'Đang chăm sóc', value: summary.activePipelineCount, color: '#1677ff', note: manager ? `${summary.unassignedCount || 0} lead chưa phân công` : 'Lead chưa đăng ký hoặc kết thúc' },
    { title: 'Cần chăm sóc', value: summary.staleLeadsCount, color: '#d48806', note: 'Chưa liên hệ hoặc đã quá 3 ngày' },
    { title: 'Đã đăng ký', value: summary.enrolledCount, color: '#389e0d', note: 'Theo giai đoạn CRM đã ghi nhận' },
    { title: 'Tỷ lệ đăng ký', value: rate, color: '#262626', note: 'Đã đăng ký / tổng lead theo bộ lọc', suffix: '%' },
  ];
  return (
    <Row gutter={[12, 12]}>
      {cards.map(card => (
        <Col xs={12} lg={6} key={card.title}>
          <Card size="small" loading={loading} styles={{ body: { padding: 16 } }}>
            <Statistic title={card.title} value={data ? card.value || 0 : '—'} suffix={data ? card.suffix : undefined} styles={{ content: { fontSize: 24, color: card.color } }} />
            <div className="mt-1 text-xs text-gray-500">{card.note}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

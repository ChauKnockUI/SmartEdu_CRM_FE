import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DollarOutlined,
  FilterOutlined,
  FireOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { leadService } from '@/services/api/lead.service';

interface LeadFunnelAnalyticsProps {
  courses: any[];
  sales: any[];
  userRole?: string;
}

const formatCurrency = (val = 0) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`;
const formatCompactMoney = (val = 0) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}tr`;
  return `${new Intl.NumberFormat('vi-VN').format(val)}`;
};

const sourceLabels: Record<string, string> = {
  facebook: 'Facebook Ads',
  google_ads: 'Google Ads',
  website_organic: 'Website Organic',
  tiktok: 'TikTok',
  referral: 'Giới thiệu',
  other: 'Khác',
};

export function LeadFunnelAnalytics({ courses, sales, userRole }: LeadFunnelAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  const [selectedSaleId, setSelectedSaleId] = useState<number | undefined>();
  const [selectedSource, setSelectedSource] = useState<string | undefined>();

  const fetchFunnel = async () => {
    try {
      setLoading(true);
      const res = await leadService.getFunnel({
        course_id: selectedCourseId,
        assigned_to: selectedSaleId,
        source: selectedSource,
      });
      setFunnelData(res.data);
    } catch (err: any) {
      console.error('Lỗi tải báo cáo phễu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnel();
  }, [selectedCourseId, selectedSaleId, selectedSource]);

  if (loading && !funnelData) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const summary = funnelData?.summary || {};
  const stages = funnelData?.stages || [];
  const progression = funnelData?.progressionFunnel || [];
  const sources = funnelData?.sourcePerformance || [];

  // Tìm điểm nghẽn lớn nhất trong progression (bước có tỷ lệ rớt lớn nhất)
  let biggestDropStep = '';
  let highestDropRate = 0;

  for (let i = 1; i < progression.length; i += 1) {
    const prev = progression[i - 1];
    const curr = progression[i];
    if (prev.count > 0) {
      const dropRate = 100 - curr.conversionFromPrevious;
      if (dropRate > highestDropRate) {
        highestDropRate = dropRate;
        biggestDropStep = `${prev.step} ➔ ${curr.step}`;
      }
    }
  }

  const sourceChartData = sources.map((s: any) => ({
    name: sourceLabels[s.source] || s.source,
    'Tổng lead': s.total,
    'Đã chốt': s.enrolled,
    'Tỉ lệ chốt (%)': s.conversionRate,
  }));

  const stageColumns = [
    {
      title: 'Tầng Phễu (Giai đoạn)',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: any) => (
        <Space>
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: record.color }}
          />
          <span className="font-medium text-gray-800">{text}</span>
          <span className="text-xs text-gray-400">({record.description})</span>
        </Space>
      ),
    },
    {
      title: 'Số Lead',
      dataIndex: 'count',
      key: 'count',
      align: 'right' as const,
      render: (val: number, record: any) => (
        <span className="font-semibold text-gray-800">
          {val} <span className="font-normal text-gray-400">({record.percentage}%)</span>
        </span>
      ),
    },
    {
      title: 'Tổng Giá trị (Pipeline Value)',
      dataIndex: 'totalValue',
      key: 'totalValue',
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-medium text-blue-600">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Doanh thu Kỳ vọng AI',
      dataIndex: 'weightedValue',
      key: 'weightedValue',
      align: 'right' as const,
      render: (val: number) => (
        <Tooltip title="Giá trị khóa học nhân với xác suất chốt của AI">
          <span className="font-medium text-purple-600">{formatCurrency(val)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Điểm AI TB',
      dataIndex: 'avgScore',
      key: 'avgScore',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color={val >= 70 ? 'green' : val >= 50 ? 'gold' : 'default'}>
          {val}%
        </Tag>
      ),
    },
    {
      title: 'Cần chăm sóc (>3 ngày)',
      dataIndex: 'staleCount',
      key: 'staleCount',
      align: 'center' as const,
      render: (val: number) =>
        val > 0 ? (
          <Tag color="error" className="font-medium">
            {val} lead
          </Tag>
        ) : (
          <span className="text-gray-400">0</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar matching standard Ant Design page filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space size={12} wrap>
          <Select
            placeholder="Tất cả khóa học"
            style={{ width: 190 }}
            allowClear
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            options={courses.map((c) => ({ label: c.name, value: c.id }))}
          />

          <Select
            placeholder="Tất cả nguồn lead"
            style={{ width: 180 }}
            allowClear
            value={selectedSource}
            onChange={setSelectedSource}
            options={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))}
          />

          {userRole === 'admin' && (
            <Select
              placeholder="Tất cả nhân viên sale"
              style={{ width: 180 }}
              allowClear
              value={selectedSaleId}
              onChange={setSelectedSaleId}
              options={sales.map((s) => ({ label: s.full_name, value: s.id }))}
            />
          )}
        </Space>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchFunnel}
        >
          Làm mới
        </Button>
      </div>

      {/* Top 4 KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic
              title={<span className="text-gray-500">Tổng lead trong phễu</span>}
              value={summary.totalLeads || 0}
              prefix={<TeamOutlined />}
              suffix={
                <span className="text-xs text-gray-400 font-normal">
                  ({summary.activePipelineCount || 0} đang chăm sóc)
                </span>
              }
              valueStyle={{ color: '#1677ff', fontSize: 22, lineHeight: 1.2 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic
              title={<span className="text-gray-500">Giá trị Pipeline</span>}
              value={summary.activePipelineValue || 0}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14', fontSize: 20, lineHeight: 1.2 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic
              title={
                <Tooltip title="Giá trị kỳ vọng = Tổng (Giá khóa học * Xác suất chốt của AI). Thước đo doanh thu dự kiến chuẩn mực nhất của CRM hiện đại.">
                  <span className="cursor-help text-gray-500">
                    Kỳ vọng AI <InfoCircleOutlined className="text-[11px]" />
                  </span>
                </Tooltip>
              }
              value={summary.weightedPipelineValue || 0}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: 20, lineHeight: 1.2 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: { padding: 16 } }}>
            <Statistic
              title={<span className="text-gray-500">Tỉ lệ chốt thành công</span>}
              value={summary.winRate || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 22, lineHeight: 1.2 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bottleneck Alert */}
      {biggestDropStep && highestDropRate > 30 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={
            <div className="font-semibold text-amber-900">
              Phát hiện điểm nghẽn phễu: Bước &ldquo;{biggestDropStep}&rdquo; (Rớt {highestDropRate.toFixed(1)}%)
            </div>
          }
          description={
            <div className="text-xs text-amber-800">
              Tỷ lệ khách hàng rơi rụng lớn nhất ở giai đoạn này. Khuyến nghị quản lý kiểm tra lại kịch bản tư vấn hoặc phương án học thử để nâng cao tỷ lệ chuyển đổi.
            </div>
          }
        />
      )}

      {/* Funnel Visualizer + Lead Source Chart */}
      <Row gutter={[16, 16]}>
        {/* Step-by-step Funnel Visualizer */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <LineChartOutlined className="text-blue-600" />
                <span>Mô hình chuyển đổi phễu</span>
              </div>
            }
            styles={{ body: { padding: 16 } }}
          >
            {progression.length === 0 ? (
              <Empty description="Chưa có dữ liệu phễu" />
            ) : (
              <div className="space-y-4">
                {progression.map((item: any, index: number) => {
                  const isTop = index === 0;
                  const prev = index > 0 ? progression[index - 1] : null;
                  const dropOff = prev && prev.count > 0
                    ? Number((100 - item.conversionFromPrevious).toFixed(1))
                    : 0;

                  return (
                    <div key={item.step} className="relative rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-800">
                          {item.step}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">
                            {item.count} lead
                          </span>
                          <Tag color={item.color} className="m-0 font-medium">
                            {item.percentOfTotal}% tổng phễu
                          </Tag>
                        </div>
                      </div>

                      <div className="mt-2">
                        <Progress
                          percent={item.percentOfTotal}
                          strokeColor={item.color}
                          showInfo={false}
                          size={['100%', 10]}
                        />
                      </div>

                      {!isTop && (
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <ArrowUpOutlined /> Lọt qua từ bước trước: <strong>{item.conversionFromPrevious}%</strong>
                          </span>
                          {dropOff > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <ArrowDownOutlined /> Rớt lại: <strong>{dropOff}%</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Lead Source Performance */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <RiseOutlined className="text-emerald-600" />
                <span>Hiệu quả nguồn lead</span>
              </div>
            }
            styles={{ body: { padding: 16 } }}
          >
            {sourceChartData.length === 0 ? (
              <Empty description="Chưa có dữ liệu nguồn lead" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sourceChartData} margin={{ top: 12, right: 12, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Tổng lead" fill="#1677ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Đã chốt" fill="#52c41a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Detailed Stages Breakdown Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <DollarOutlined className="text-amber-600" />
            <span>Thống Kê Chi Tiết Từng Tầng Phễu (Stage Breakdown)</span>
          </div>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={stages}
          columns={stageColumns}
          rowKey="stage"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}

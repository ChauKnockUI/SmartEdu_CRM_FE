import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Empty, List, Progress, Row, Space, Spin, Statistic, Tag, Timeline } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  PhoneOutlined,
  RiseOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '../../shared/contexts/AuthContext';
import { dashboardService, type DashboardOverview } from '../../services/api/dashboard.service';
import { leadService } from '../../services/api/lead.service';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { getLeadStatus } from '../crm/leadStatus';
import { RiskEstimate, SupportPriority, riskTime } from '../../shared/components/DropoutRisk';
import { BillingStatusTag } from '../finance/billingStatus';

const COLORS = ['#1677ff', '#13c2c2', '#faad14', '#ff7a45', '#722ed1'];
const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const formatCurrency = (value = 0) => `${money.format(value)} đ`;
const formatCompactMoney = (value = 0) => (value >= 1000000 ? `${Math.round(value / 1000000)}tr` : money.format(value));
const formatTime = (value?: string) => value?.match(/(?:^|T)(\d{2}:\d{2})/)?.[1] || '--:--';
const formatDate = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

const emptyOverview = (role: DashboardOverview['role']): DashboardOverview => ({
  role,
  kpis: {},
  charts: {},
  alerts: [],
  activities: [],
  lists: {},
});

function EmptyState({ text = 'Chưa có dữ liệu' }: { text?: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} className="my-6" />;
}

function DashboardCard({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Card title={title} extra={extra} styles={{ body: { padding: 16 } }}>
      {children}
    </Card>
  );
}

function KpiCard({
  title,
  value,
  prefix,
  suffix,
  color,
  currency,
  to,
  note,
}: {
  title: string;
  value: number;
  prefix: ReactNode;
  suffix?: ReactNode;
  color: string;
  currency?: boolean;
  to?: string;
  note?: string;
}) {
  const card = (
      <Card styles={{ body: { padding: 16 } }}>
        <Statistic
          title={<span className="text-gray-500">{title}</span>}
          value={value}
          prefix={prefix}
          suffix={currency ? undefined : suffix}
          formatter={currency ? (current) => formatCurrency(Number(current)) : undefined}
          valueStyle={{ color, fontSize: currency ? 22 : 24, lineHeight: 1.2 }}
        />
        {note && <div className="mt-2 text-xs text-gray-500">{note}</div>}
      </Card>
  );
  return (
    <Col xs={24} sm={12} lg={6}>
      {to ? <Link to={to} className="block" aria-label={`Xem ${title}`}>{card}</Link> : card}
    </Col>
  );
}

export function LeadStatusSummary({ data, error }: { data: any; error?: string | null }) {
  if (error) return <Alert type="warning" showIcon message="Chưa tải được dữ liệu Lead" description="Vui lòng bấm Tải lại để thử lại." />;
  if (!data?.stages?.length) return <EmptyState text="Chưa có dữ liệu Lead" />;
  const summary = data.summary || {};
  const rate = summary.totalLeads ? Math.round(summary.enrolledCount / summary.totalLeads * 1000) / 10 : 0;
  return <div className="space-y-2.5">
    <p className="text-xs text-gray-500">Phân bố theo trạng thái hiện tại, không phải lịch sử chuyển bước.</p>
    {data.stages.map((stage: any) => <div key={stage.stage}>
      <div className="flex justify-between text-xs text-gray-700">
        <span className="font-medium">{stage.label}</span>
        <span className="font-semibold text-gray-900">{stage.count} lead ({stage.percentage}%)</span>
      </div>
      <Progress percent={stage.percentage} strokeColor={stage.color} showInfo={false} size={['100%', 8]} />
    </div>)}
    <div className="flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
      <span>Giá trị khóa quan tâm: <strong className="text-blue-600">{formatCompactMoney(summary.activePipelineValue || 0)}đ</strong></span>
      <span>Tỷ lệ đăng ký: <strong className="text-emerald-600">{rate}%</strong></span>
    </div>
    <p className="text-xs text-gray-500">Giá trị khóa quan tâm chưa phải doanh thu đã thu. Tỷ lệ đăng ký = Đã đăng ký / tổng Lead.</p>
  </div>;
}

function AlertIcon({ type }: { type?: string }) {
  const color = type === 'error' ? 'text-red-500' : type === 'info' ? 'text-blue-500' : 'text-orange-500';
  return <WarningOutlined className={`text-lg ${color}`} />;
}

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'admin';
  const navigate = useNavigate();
  const { openDetail } = useDetailNavigation();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFunnelData(null);
    setFunnelError(null);

    dashboardService.getOverview()
      .then((data) => {
        if (!mounted) return;
        setOverview(data);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setOverview(emptyOverview(role));
        setError(err.message || 'Không tải được dữ liệu dashboard.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Tải thông số phễu chuyển đổi cho Admin & Sale
    if (role === 'admin' || role === 'sale') {
      leadService.getFunnel()
        .then((res) => {
          if (mounted && res?.data) {
            setFunnelData(res.data);
          }
        })
        .catch(() => { if (mounted) setFunnelError('Không tải được dữ liệu Lead'); });
    }

    return () => {
      mounted = false;
    };
  }, [role, user?.id, revision]);

  const data = useMemo(() => overview || emptyOverview(role), [overview, role]);
  const kpis = data.kpis || {};
  const lists = data.lists || {};

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert
          type="warning"
          showIcon
          message="Chưa tải được dữ liệu dashboard"
          description="Dashboard không hiển thị số liệu demo. Vui lòng kiểm tra backend, token đăng nhập hoặc kết nối cơ sở dữ liệu."
        />
      )}

      {data.role === 'admin' && (
        <>
          <PageHeader title={`Chào mừng, ${user?.name || 'Admin'}`} subtitle="Tổng quan vận hành SmartEdu CRM"
            actions={<Button icon={<ReloadOutlined />} onClick={() => setRevision(value => value + 1)}>Tải lại</Button>} />
          <Row gutter={[16, 16]}>
            <KpiCard title="Lead mới trong tháng" value={kpis.newLeads || 0} prefix={<UserAddOutlined />} color="#3f8600" to={data.links?.newLeads} note="Theo ngày tạo, bao gồm mọi trạng thái" />
            <KpiCard title="Tỷ lệ đăng ký" value={kpis.conversionRate || 0} prefix={<RiseOutlined />} suffix="%" color="#cf1322" to={data.links?.conversionRate} note="Đã đăng ký / tổng Lead" />
            <KpiCard title="Học viên đang học" value={kpis.activeStudents || 0} prefix={<TeamOutlined />} color="#1677ff" />
            <KpiCard title="Doanh thu tháng" value={kpis.monthRevenue || 0} prefix={<DollarOutlined />} color="#52c41a" currency />
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Doanh thu 6 tháng gần nhất">
                {data.charts?.revenueLast6Months?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.charts.revenueLast6Months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickMargin={8} />
                      <YAxis tickFormatter={(value) => formatCompactMoney(Number(value))} width={52} />
                      <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Doanh thu']} />
                      <Line type="monotone" dataKey="revenue" stroke="#1677ff" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState />
                )}
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard
                title="Phân bố trạng thái Lead"
                extra={
                  <Button type="link" onClick={() => navigate('/crm/leads?tab=funnel')}>
                    Xem chi tiết
                  </Button>
                }
              >
                <LeadStatusSummary data={funnelData} error={funnelError} />
              </DashboardCard>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Nguồn lead">
                {data.charts?.leadSources?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.charts.leadSources} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={82} dataKey="value">
                        {data.charts.leadSources.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState />
                )}
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Cảnh báo hệ thống" extra={<Badge count={data.alerts?.length || 0} />}>
                <List
                  locale={{ emptyText: 'Chưa có cảnh báo' }}
                  dataSource={data.alerts || []}
                  rowKey="id"
                  renderItem={(item) => (
                    <List.Item actions={[item.action ? <Button key="view" type="link" onClick={() => navigate(item.action!)}>Xem</Button> : null]}>
                      <List.Item.Meta avatar={<AlertIcon type={item.type} />} title={item.title} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <DashboardCard title="Hoạt động gần đây">
                {data.activities?.length ? (
                  <Timeline items={data.activities.map((item) => ({ children: <div><strong>{item.actor}</strong> {item.text} - {formatTime(item.time)}
                    {item.action && <Button type="link" size="small" onClick={() => openDetail(item.action!)}>Xem Lead</Button>}</div> }))} />
                ) : (
                  <EmptyState text="Chưa có hoạt động gần đây" />
                )}
              </DashboardCard>
            </Col>
          </Row>
        </>
      )}

      {data.role === 'sale' && (
        <>
          <PageHeader title={`Chào ${user?.name || 'Sale'}`} subtitle="Theo dõi Lead và công nợ cần xử lý"
            actions={<Button icon={<ReloadOutlined />} onClick={() => setRevision(value => value + 1)}>Tải lại</Button>} />
          <Row gutter={[16, 16]}>
            <KpiCard title="Lead của tôi" value={kpis.myLeads || 0} prefix={<UserAddOutlined />} color="#1677ff" to={data.links?.myLeads} />
            <KpiCard title="Cần chăm sóc" value={kpis.needsCare || 0} prefix={<PhoneOutlined />} color="#f5222d" to={data.links?.needsCare} note="Chưa liên hệ hoặc đã quá 3 ngày" />
            <KpiCard title="Tỷ lệ đăng ký" value={kpis.conversionRate || 0} prefix={<RiseOutlined />} suffix="%" color="#52c41a" to={data.links?.conversionRate} note="Đã đăng ký / tổng Lead của tôi" />
            <KpiCard title="Công nợ cần thu" value={kpis.debtToCollect || 0} prefix={<DollarOutlined />} color="#faad14" currency
              to={data.links?.debtToCollect} note="Học viên từ Lead đang phụ trách" />
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Lead mới cần tiếp nhận" extra={<Button type="primary" onClick={() => navigate('/crm/leads?status=new')}>Xem tất cả</Button>}>
                <List
                  locale={{ emptyText: 'Không có Lead mới cần tiếp nhận' }}
                  dataSource={lists.priorityLeads || []}
                  rowKey="id"
                  renderItem={(lead: any) => (
                    <List.Item actions={[<Button key="detail" type="link" onClick={() => openDetail(`/crm/leads/${lead.id}`)}>Chi tiết</Button>]}>
                      <List.Item.Meta title={<Space wrap>{lead.name}<Tag color={getLeadStatus('new')?.color}>{getLeadStatus('new')?.label}</Tag></Space>} description={`${lead.phone || 'Chưa có số điện thoại'} - ${lead.source || 'Khác'}`} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard
                title="Phân bố trạng thái Lead"
                extra={
                  <Button type="link" onClick={() => navigate('/crm/leads?tab=funnel')}>
                    Xem báo cáo
                  </Button>
                }
              >
                <LeadStatusSummary data={funnelData} error={funnelError} />
              </DashboardCard>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Lead cần liên hệ lại" extra={<Button type="link" onClick={() => navigate('/crm/leads?needs_care=true')}>Xem tất cả</Button>}>
                <List locale={{ emptyText: 'Không có Lead cần liên hệ lại' }} dataSource={lists.careLeads || []} rowKey="id"
                  renderItem={(item: any) => <List.Item actions={[<Button key="contact" type="link"
                    onClick={() => openDetail(`/crm/leads/${item.id}?contact=1`)}>Ghi nhận liên hệ</Button>]}>
                    <List.Item.Meta title={item.name} description={`${item.reason}${item.last_contacted ? ` · Gần nhất: ${formatDate(item.last_contacted)}` : ''}`} />
                  </List.Item>} />
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Khoản phải thu cần xử lý" extra={<Space><Badge count={kpis.debtCases || 0} />
                <Button type="link" onClick={() => navigate('/finance/debts')}>Xem tất cả</Button></Space>}>
                <List
                  locale={{ emptyText: 'Chưa có công nợ cần xử lý' }}
                  dataSource={lists.paymentIssues || []}
                  rowKey="id"
                  renderItem={(item: any) => (
                    <List.Item actions={[<Button key="call" type="link" icon={<PhoneOutlined />} disabled={!item.phone}
                      href={item.phone ? `tel:${item.phone}` : undefined}>Gọi ngay</Button>,
                      <Button key="invoice" type="link" onClick={() => openDetail(item.action)}>Xem khoản phải thu</Button>]}>
                      <List.Item.Meta title={<Space wrap>{item.name}<BillingStatusTag status={item.status} />
                        {item.overdue > 0 && <span className="text-xs text-red-600">Trễ {item.overdue} ngày</span>}</Space>} description={`${item.invoiceNo || ''} · Công nợ: ${formatCurrency(item.amount || 0)}`} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
          </Row>
        </>
      )}

      {data.role === 'teacher' && (
        <>
          <PageHeader title={`Chào Thầy/Cô ${user?.name || ''}`} subtitle="Lịch dạy, điểm danh và học viên cần theo dõi"
            actions={<Button icon={<ReloadOutlined />} onClick={() => setRevision(value => value + 1)}>Tải lại</Button>} />
          <Alert message={`Hôm nay có ${(lists.todayClasses || []).length} buổi dạy`} type="info" showIcon />
          <Row gutter={[16, 16]}>
            <KpiCard title="Lớp đang dạy" value={kpis.activeClasses || 0} prefix={<BookOutlined />} color="#1677ff" />
            <KpiCard title="Học viên phụ trách" value={kpis.students || 0} prefix={<TeamOutlined />} color="#52c41a" />
            <KpiCard title="Buổi dạy tuần này" value={kpis.sessionsThisWeek || 0} prefix={<CalendarOutlined />} color="#faad14" />
            <KpiCard title="Tỉ lệ đi học TB" value={kpis.attendanceRate || 0} prefix={<CheckCircleOutlined />} suffix="%" color="#52c41a" />
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Lịch dạy hôm nay">
                <List
                  locale={{ emptyText: 'Hôm nay chưa có lịch dạy' }}
                  dataSource={lists.todayClasses || []}
                  rowKey="id"
                  renderItem={(item: any) => (
                    <List.Item actions={[<Button key="attendance" type="primary" icon={<CheckCircleOutlined />} onClick={() => navigate(`/lms/classes/${item.classId}`)}>Điểm danh</Button>]}>
                      <List.Item.Meta avatar={<CalendarOutlined className="text-xl text-blue-500" />} title={item.name} description={`${formatTime(item.startTime)}-${formatTime(item.endTime)} - ${item.room || 'Chưa có phòng'}`} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Học viên cần hỗ trợ theo lớp" extra={<Space><Badge count={kpis.supportCases || 0} />
                <Button type="link" onClick={() => navigate(data.links?.dropoutAttention || '/ai/predictions?risk_level=attention')}>Xem tất cả</Button></Space>}>
                <List
                  locale={{ emptyText: 'Chưa có học viên cần chú ý' }}
                  dataSource={lists.attentionStudents || []}
                  rowKey="id"
                  renderItem={(item: any) => (
                    <List.Item actions={[<Button key="risk" type="link" onClick={() => openDetail(item.action)}>Xem cảnh báo</Button>]}>
                      <List.Item.Meta avatar={<WarningOutlined className="text-lg text-orange-500" />}
                        title={<Space wrap>{item.name}<SupportPriority data={item.risk} /></Space>}
                        description={<Space direction="vertical" size={2}><span>{item.className}</span><RiskEstimate data={item.risk} />
                          <span className="text-xs text-gray-500">{riskTime(item.risk?.evaluated_at)}</span></Space>} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Buổi dạy sắp tới">
                {lists.upcomingSessions?.length ? (
                  <Timeline items={lists.upcomingSessions.map((item: any) => ({ children: <div><strong>{formatDate(item.date)}</strong> - {item.name} ({formatTime(item.startTime)}-{formatTime(item.endTime)})</div> }))} />
                ) : (
                  <EmptyState text="Tuần này chưa có buổi dạy" />
                )}
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Tài liệu và ghi chú">
                <List
                  locale={{ emptyText: 'Chưa có tài liệu' }}
                  dataSource={lists.materials || []}
                  rowKey="id"
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta avatar={<FileTextOutlined className="text-lg text-blue-500" />} title={item.title} description={formatDate(item.date)} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
          </Row>
        </>
      )}

      {data.role === 'student' && (
        <>
          <PageHeader title={`Chào ${user?.name || 'bạn'}`} subtitle="Lịch học, tiến độ và học phí của bạn"
            actions={<Button onClick={() => openDetail('/lms/my-profile')}>Hồ sơ của tôi</Button>} />
          {lists.nextClass && (
            <Alert
              message={`Buổi học tiếp theo: ${formatDate(lists.nextClass.date)}`}
              description={`${lists.nextClass.name} - ${formatTime(lists.nextClass.startTime)}-${formatTime(lists.nextClass.endTime)} tại ${lists.nextClass.room || 'chưa có phòng'}`}
              type="info"
              showIcon
              icon={<CalendarOutlined />}
            />
          )}
          <Row gutter={[16, 16]}>
            <KpiCard title="Tỉ lệ tham gia" value={kpis.attendanceRate || 0} prefix={<CheckCircleOutlined />} suffix="%" color="#52c41a" />
            <KpiCard title="Buổi đã học" value={kpis.attendedSessions || 0} prefix={<BookOutlined />} color="#1677ff" />
            <KpiCard title="Buổi vắng" value={kpis.absentSessions || 0} prefix={<CloseCircleOutlined />} color="#f5222d" />
            <KpiCard title="Bài tập chưa nộp" value={kpis.missingAssignments || 0} prefix={<FileTextOutlined />} color="#faad14" />
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Lịch học tuần này">
                {lists.weekSchedule?.length ? (
                  <Timeline items={lists.weekSchedule.map((item: any) => ({ children: <div><strong>{formatDate(item.date)} - {formatTime(item.startTime)}-{formatTime(item.endTime)}</strong><div className="text-gray-600">{item.name} - {item.room || 'Chưa có phòng'}</div></div> }))} />
                ) : (
                  <EmptyState text="Tuần này chưa có lịch học" />
                )}
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Tiến độ học tập">
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <div className="mb-2 flex justify-between"><span>Hoàn thành khóa học</span><strong>{lists.progress?.courseCompletion || 0}%</strong></div>
                    <Progress percent={lists.progress?.courseCompletion || 0} />
                    <p className="mt-1 text-sm text-gray-600">{lists.progress?.attended || 0}/{lists.progress?.totalTarget || 50} buổi học</p>
                  </div>
                </Space>
              </DashboardCard>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Học phí" extra={<Link to="/lms/my-profile?tab=finance">Xem tất cả</Link>}>
                <List
                  locale={{ emptyText: 'Chưa có hóa đơn' }}
                  dataSource={lists.invoices || []}
                  rowKey="id"
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta title={item.className || item.title} description={`Hạn: ${formatDate(item.dueDate)} · Phải thu: ${formatCurrency(item.amount || 0)} · Còn nợ: ${formatCurrency(item.remainingAmount || 0)}`} />
                      <BillingStatusTag status={item.status} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Bài tập và tài liệu">
                <List
                  locale={{ emptyText: 'Chưa có tài liệu' }}
                  dataSource={lists.materials || []}
                  rowKey="id"
                  renderItem={(item: any) => (
                    <List.Item actions={[<Button key="download" type="link" size="small">Tải xuống</Button>]}>
                      <List.Item.Meta avatar={<FileTextOutlined className="text-lg text-blue-500" />} title={item.title} description={formatDate(item.date)} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

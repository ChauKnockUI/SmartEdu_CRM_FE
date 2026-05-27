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
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '../../shared/contexts/AuthContext';
import { dashboardService, type DashboardOverview } from '../../services/api/dashboard.service';

const COLORS = ['#1677ff', '#13c2c2', '#faad14', '#ff7a45', '#722ed1'];
const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const formatCurrency = (value = 0) => `${money.format(value)} đ`;
const formatCompactMoney = (value = 0) => (value >= 1000000 ? `${Math.round(value / 1000000)}tr` : money.format(value));
const formatTime = (value?: string) => (value ? dayjs(value).format('HH:mm') : '--:--');
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
}: {
  title: string;
  value: number;
  prefix: ReactNode;
  suffix?: ReactNode;
  color: string;
  currency?: boolean;
}) {
  return (
    <Col xs={24} sm={12} lg={6}>
      <Card styles={{ body: { padding: 16 } }}>
        <Statistic
          title={<span className="text-gray-500">{title}</span>}
          value={value}
          prefix={prefix}
          suffix={currency ? undefined : suffix}
          formatter={currency ? (current) => formatCurrency(Number(current)) : undefined}
          valueStyle={{ color, fontSize: currency ? 22 : 24, lineHeight: 1.2 }}
        />
      </Card>
    </Col>
  );
}

function AlertIcon({ type }: { type?: string }) {
  const color = type === 'error' ? 'text-red-500' : type === 'info' ? 'text-blue-500' : 'text-orange-500';
  return <WarningOutlined className={`text-lg ${color}`} />;
}

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'admin';
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

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

    return () => {
      mounted = false;
    };
  }, [role]);

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
          <PageHeader title={`Chào mừng, ${user?.name || 'Admin'}`} subtitle="Tổng quan vận hành SmartEdu CRM" />
          <Row gutter={[16, 16]}>
            <KpiCard title="Lead mới trong tháng" value={kpis.newLeads || 0} prefix={<UserAddOutlined />} color="#3f8600" />
            <KpiCard title="Tỉ lệ chuyển đổi" value={kpis.conversionRate || 0} prefix={<RiseOutlined />} suffix="%" color="#cf1322" />
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
          </Row>

          <Row gutter={[16, 16]}>
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
            <Col xs={24} lg={12}>
              <DashboardCard title="Hoạt động gần đây">
                {data.activities?.length ? (
                  <Timeline items={data.activities.map((item) => ({ children: <div><strong>{item.actor}</strong> {item.text} - {formatTime(item.time)}</div> }))} />
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
          <PageHeader title={`Chào ${user?.name || 'Sale'}`} subtitle="Theo dõi lead, follow-up và công nợ cần xử lý" />
          <Row gutter={[16, 16]}>
            <KpiCard title="Lead của tôi" value={kpis.myLeads || 0} prefix={<UserAddOutlined />} color="#1677ff" />
            <KpiCard title="Follow-up hôm nay" value={kpis.followUpToday || 0} prefix={<PhoneOutlined />} color="#f5222d" />
            <KpiCard title="Tỉ lệ chuyển đổi tháng" value={kpis.conversionRate || 0} prefix={<RiseOutlined />} suffix="%" color="#52c41a" />
            <KpiCard title="Công nợ cần thu" value={kpis.debtToCollect || 0} prefix={<DollarOutlined />} color="#faad14" currency />
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Lead ưu tiên" extra={<Button type="primary" onClick={() => navigate('/crm/leads')}>Xem tất cả</Button>}>
                <List
                  locale={{ emptyText: 'Chưa có lead ưu tiên' }}
                  dataSource={lists.priorityLeads || []}
                  rowKey="id"
                  renderItem={(lead: any) => (
                    <List.Item actions={[<Button key="detail" type="link" onClick={() => navigate(`/crm/leads/${lead.id}`)}>Chi tiết</Button>]}>
                      <List.Item.Meta title={<Space wrap>{lead.name}<Tag color={lead.score >= 80 ? 'green' : lead.score >= 60 ? 'orange' : 'default'}>Điểm: {lead.score || 0}</Tag></Space>} description={`${lead.phone || 'Chưa có số điện thoại'} - ${lead.source || 'Khác'}`} />
                    </List.Item>
                  )}
                />
              </DashboardCard>
            </Col>
            <Col xs={24} lg={12}>
              <DashboardCard title="Lịch follow-up hôm nay">
                {lists.followUps?.length ? (
                  <Timeline items={lists.followUps.map((item: any) => ({ children: <div><strong>{item.time}</strong> - {item.title}</div> }))} />
                ) : (
                  <EmptyState text="Chưa có lịch follow-up" />
                )}
              </DashboardCard>
            </Col>
          </Row>
        </>
      )}

      {data.role === 'teacher' && (
        <>
          <PageHeader title={`Chào Thầy/Cô ${user?.name || ''}`} subtitle="Lịch dạy, điểm danh và học viên cần theo dõi" />
          <Alert message={`Hôm nay có ${(lists.todayClasses || []).length} buổi dạy`} type="info" showIcon />
          <Row gutter={[16, 16]}>
            <KpiCard title="Lớp đang dạy" value={kpis.activeClasses || 0} prefix={<BookOutlined />} color="#1677ff" />
            <KpiCard title="Học viên phụ trách" value={kpis.students || 0} prefix={<TeamOutlined />} color="#52c41a" />
            <KpiCard title="Buổi dạy tuần này" value={kpis.sessionsThisWeek || 0} prefix={<CalendarOutlined />} color="#faad14" />
            <KpiCard title="Tỉ lệ đi học TB" value={kpis.attendanceRate || 0} prefix={<CheckCircleOutlined />} suffix="%" color="#52c41a" />
          </Row>
        </>
      )}

      {data.role === 'student' && (
        <>
          <PageHeader title={`Chào ${user?.name || 'bạn'}`} subtitle="Lịch học, tiến độ và học phí của bạn" />
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
        </>
      )}
    </div>
  );
}

import { SummaryCard as KpiCard } from '../../shared/components/SummaryCard';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Col, Empty, List, Progress, Row, Segmented, Space, Spin, Tag, Timeline, message } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PhoneOutlined,
  RiseOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '../../shared/contexts/AuthContext';
import { dashboardService, type DashboardMaterial, type DashboardOverview, type StudentClassProgress } from '../../services/api/dashboard.service';
import { downloadMaterial, materialFileSize } from '../../services/api/material.service';
import { leadService } from '../../services/api/lead.service';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { SupportPriority } from '../../shared/components/DropoutRisk';
import { BillingStatusTag } from '../finance/billingStatus';
import { DashboardWorkCard } from './DashboardWorkCard';
import { SessionStatusTag } from '../lms/sessionStatus';
import { getClassStatus } from '../lms/classFilters';
import { paginationProps } from '../../shared/utils/pagination';
import type { AttendanceSummary } from '../../shared/utils/attendance';
import { Disclosure } from '../../shared/components/Disclosure';
import { InfoHint } from '../../shared/components/InfoHint';

const COLORS = ['#1677ff', '#13c2c2', '#faad14', '#ff7a45', '#722ed1'];
const dashboardTitles = { admin: 'Tổng quan trung tâm', sale: 'Tổng quan tư vấn', teacher: 'Tổng quan giảng dạy', student: 'Tổng quan học tập' };
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

export function LeadStatusSummary({ data, error }: { data: any; error?: string | null }) {
  if (error) return <Alert type="warning" showIcon message="Chưa tải được dữ liệu Lead" description="Vui lòng bấm Tải lại để thử lại." />;
  if (!data?.stages?.length) return <EmptyState text="Chưa có dữ liệu Lead" />;
  const summary = data.summary || {};
  const rate = summary.totalLeads ? Math.round(summary.enrolledCount / summary.totalLeads * 1000) / 10 : 0;
  return <div className="space-y-2.5">
    <div className="flex items-center justify-between text-xs text-gray-500">
      <span>Trạng thái hiện tại</span>
      <InfoHint label="Cách đọc thống kê Lead">
        <p>Phân bố theo trạng thái hiện tại, không phải lịch sử chuyển bước.</p>
        <p>Giá trị khóa quan tâm chưa phải doanh thu đã thu. Tỷ lệ đăng ký = Đã đăng ký / tổng Lead.</p>
      </InfoHint>
    </div>
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
  </div>;
}

export function AttendanceSummaryLine({ summary, scope }: { summary?: AttendanceSummary; scope: string }) {
  return <div className="crm-attendance-strip text-sm">
    <div className="crm-attendance-scope">Phạm vi: {scope}</div>
    {summary?.marked ? <>
      <Space wrap><span>Có mặt: {summary.present}</span><span>Muộn: {summary.late}</span>
        <span>Vắng không phép: {summary.absent}</span><span>Vắng có phép: {summary.excused}</span></Space>
      <p>Tỷ lệ tham gia = (Có mặt + Muộn) / {summary.marked} bản ghi đã điểm danh, gồm cả vắng có phép.</p>
      <p>Chỉ buổi đã kết thúc, không gồm buổi/lớp đã hủy.</p>
    </> : <div className="text-gray-500">Chưa có dữ liệu điểm danh trong phạm vi này.</div>}
  </div>;
}

export function StudentProgress({ classes = [] }: { classes?: StudentClassProgress[] }) {
  if (!classes.length) return <EmptyState text="Chưa có lớp học để theo dõi tiến độ" />;
  return <>
    <List className="crm-progress-list" dataSource={classes} rowKey="classId" renderItem={item => {
      const status = getClassStatus(item.classStatus);
      return <List.Item><div className="w-full space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{item.className}</strong><Tag color={status.color}>{status.label}</Tag>
        </div>
        {item.courseName && <div className="text-xs text-gray-500">{item.courseName}</div>}
        {item.scheduledSessions ? <>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>Đã tổ chức {item.heldSessions}/{item.plannedSessions} buổi · Còn {Math.max(0, (item.plannedSessions || 0) - item.heldSessions)} buổi</span><strong className="crm-progress-value">{item.progressPercent}%</strong>
          </div>
          <Progress percent={item.progressPercent ?? 0} strokeWidth={10} showInfo={false} status="normal" />
          <div className="text-sm text-gray-600">Bạn đã tham gia: {item.attendedSessions} · Vắng: {item.absentSessions} · Vắng có phép: {item.excusedSessions}</div>
          {item.pendingMakeupSessions > 0 && <div className="text-sm text-orange-600">Chờ học bù: {item.pendingMakeupSessions} buổi (đã gồm trong kế hoạch)</div>}
          {item.awaitingConfirmationSessions > 0 && <div className="text-sm text-gray-500">Đã qua giờ học, chưa xác nhận tổ chức: {item.awaitingConfirmationSessions} buổi</div>}
        </> : <div className="text-sm text-gray-500">Chưa có lịch học{item.plannedSessions ? ` · Khóa học dự kiến ${item.plannedSessions} buổi` : ' · Chưa xác định tổng số buổi'}</div>}
      </div></List.Item>;
    }} />
    <Disclosure label="Cách tính tiến độ"><p>Tiến độ tổ chức từng lớp đang ghi danh/đã hoàn tất (không gồm lớp đã nghỉ), không phải kết quả hoàn thành khóa học.
      Buổi đã tổ chức phải kết thúc và có điểm danh hoặc xác nhận kết thúc.</p>
      <p>Có mặt và đi muộn được tính là tham gia. Chưa có điểm danh cá nhân không được tự tính là vắng.</p></Disclosure>
  </>;
}

function DashboardSchedule({ items, todayIds = [], nextId, onOpen, pageSize = 5, teacher = false, emptyText }: {
  items: any[]; todayIds?: number[]; nextId?: number; onOpen: (id: number) => void; pageSize?: number; teacher?: boolean; emptyText?: string;
}) {
  return <List className={`crm-dashboard-list${teacher ? ' crm-teaching-schedule' : ''}`} dataSource={items} rowKey="id"
    locale={{ emptyText: emptyText || 'Chưa có buổi học trong 7 ngày tới' }}
    pagination={items.length > pageSize ? paginationProps('buổi học', { pageSize, showSizeChanger: false }) : false}
    renderItem={item => <List.Item className={teacher && item.id === nextId ? 'crm-session-next' : undefined}
      actions={[<Button key="session" type={teacher ? 'default' : 'link'} size="small" onClick={() => onOpen(item.id)}>{teacher ? 'Mở buổi' : 'Xem buổi học'}</Button>]}>
      <div className={teacher ? 'crm-teaching-slot' : 'min-w-0'}>
        {teacher && <div className="crm-session-time"><strong>{formatTime(item.startTime)}</strong><span>– {formatTime(item.endTime)}</span></div>}
        <div className="min-w-0">
        <div className="crm-dashboard-item-title"><strong>{item.name}</strong>
          {item.id === nextId ? <Tag color="blue">Buổi tiếp theo</Tag> : todayIds.includes(item.id) && <Tag color="blue">Hôm nay</Tag>}
          {(item.status !== 'scheduled' || item.scheduleChange?.isMakeup || item.scheduleChange?.pendingMakeup)
            && <SessionStatusTag status={item.status} scheduleChange={item.scheduleChange} />}
        </div>
        <div className="crm-dashboard-meta"><span>{formatDate(item.date)}{!teacher && ` · ${formatTime(item.startTime)}–${formatTime(item.endTime)}`}</span>
          <span>{item.room || 'Chưa có phòng'}</span></div>
        </div></div>
    </List.Item>} />;
}

function TeacherSchedule({ items, todayIds, onOpen }: { items: any[]; todayIds: number[]; onOpen: (id: number) => void }) {
  const today = items.filter(item => todayIds.includes(item.id));
  const [period, setPeriod] = useState<'today' | 'week'>(today.length ? 'today' : 'week');
  const next = items.find(item => new Date(`${String(item.date).slice(0, 10)}T${formatTime(item.startTime)}:00+07:00`).getTime() > Date.now());
  return <>
    <div className="crm-agenda-toolbar"><Segmented value={period} onChange={setPeriod}
      options={[{ value: 'today', label: `Hôm nay (${today.length})` }, { value: 'week', label: `7 ngày (${items.length})` }]} />
    </div>
    <DashboardSchedule key={period} items={period === 'today' ? today : items} todayIds={todayIds} nextId={next?.id}
      teacher pageSize={3} onOpen={onOpen} emptyText={period === 'today' ? 'Hôm nay chưa có lịch dạy' : 'Chưa có lịch dạy trong 7 ngày tới'} />
  </>;
}

function TeacherMaterials({ items, onOpen }: { items: DashboardMaterial[]; onOpen: (path: string) => void }) {
  const [downloading, setDownloading] = useState<number>();
  const busy = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const download = async (item: DashboardMaterial) => {
    if (busy.current) return;
    busy.current = true; setDownloading(item.id);
    try { await downloadMaterial(item.id, item.fileName); }
    catch (error) { if (mounted.current) message.error(error instanceof Error ? error.message : 'Không tải được tài liệu.'); }
    finally { busy.current = false; if (mounted.current) setDownloading(undefined); }
  };
  return <List className="crm-dashboard-materials" rowKey="id" dataSource={items}
    locale={{ emptyText: 'Chưa có tài liệu trong các lớp và buổi bạn phụ trách' }}
    pagination={items.length > 3 ? paginationProps('tài liệu gần đây', { pageSize: 3, showSizeChanger: false }) : false}
    renderItem={item => <List.Item><article className="crm-teacher-file">
      <div className="crm-material-title" title={item.title}><FileTextOutlined /><strong>{item.title}</strong></div>
      <div className="crm-file-class" title={item.className}>{item.className || `Lớp #${item.classId}`}</div>
      <div className="crm-material-meta">{item.schedule
        ? `Buổi ${dayjs(item.schedule.date).format('DD/MM')} · ${formatTime(item.schedule.start_time || undefined)}` : 'Chung cả lớp'}</div>
      <div className="crm-file-details" title={item.fileName}><span>{item.fileName?.split('.').pop()?.toUpperCase() || 'Tài liệu'}
        {item.fileSize != null && ` · ${materialFileSize(item.fileSize)}`}</span><span>Tải lên {formatDate(item.date)}</span></div>
      <div className="crm-file-actions"><Button size="small" icon={<DownloadOutlined />} loading={downloading === item.id}
        disabled={!item.fileName || downloading !== undefined && downloading !== item.id} onClick={() => download(item)}>Tải về</Button>
        <Button type="link" size="small" onClick={() => onOpen(item.action || `/lms/classes/${item.classId}?tab=materials`)}>Mở tài liệu</Button>
      </div>
    </article>
    </List.Item>} />;
}

export function DashboardPage() {
  const { user, token } = useAuth();
  const role = user?.role || 'admin';
  const scope = JSON.stringify([user?.id, role, token]);
  const navigate = useNavigate();
  const { openDetail } = useDetailNavigation();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewOwner, setOverviewOwner] = useState('');
  const [funnelData, setFunnelData] = useState<any>(null);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setLoading(true);
    setFunnelData(null);
    setFunnelError(null);

    dashboardService.getOverview(controller.signal, token || undefined)
      .then((data) => {
        if (!mounted) return;
        setOverview(data);
        setOverviewOwner(scope);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setOverview(null); setOverviewOwner(scope);
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
      controller.abort();
    };
  }, [scope, revision]);

  const data = useMemo(() => overviewOwner === scope && overview ? overview : emptyOverview(role), [overview, role, overviewOwner, scope]);
  const metricsLoading = loading || overviewOwner !== scope;
  const kpis = data.kpis || {};
  const lists = data.lists || {};
  const summaryAlerts = (data.alerts || []).filter(item => !['debts', 'stale-leads'].includes(item.id));
  const overviewReady = !metricsLoading && !error;
  const teacherSessions = Array.from(new Map(
    [...(lists.todayClasses || []), ...(lists.upcomingSessions || [])].map((item: any) => [item.id, item] as const)
  ).values()).sort((a, b) => String(a.date).localeCompare(String(b.date)) || formatTime(a.startTime).localeCompare(formatTime(b.startTime)));
  const attendanceNote = <AttendanceSummaryLine summary={data.attendance} scope={role === 'teacher'
    ? 'Các buổi bạn phụ trách · Toàn bộ lịch sử' : 'Tất cả lớp, gồm lớp đã nghỉ · Toàn bộ lịch sử'} />;

  return (
    <div className={`crm-page crm-dashboard${role === 'teacher' ? ' crm-teacher-dashboard' : ''}`}>
      <PageHeader title={dashboardTitles[role]}
        description={`${user?.name || 'Tài khoản'} · ${new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(new Date())}`}
        actions={<Space>
          {role === 'teacher' && <Button type="primary" icon={<CalendarOutlined />} onClick={() => openDetail('/lms/myschedule')}>Lịch dạy</Button>}
          {role === 'student' && <Button onClick={() => openDetail('/lms/my-profile')}>Hồ sơ của tôi</Button>}
          <Button icon={<ReloadOutlined />} onClick={() => setRevision(value => value + 1)}>Tải lại</Button>
        </Space>} />
      {metricsLoading && role === 'admin' && <div className="flex min-h-[160px] items-center justify-center"><Spin size="large" /></div>}
      {error && (
        <Alert
          type="warning"
          showIcon
          message="Chưa tải được dữ liệu dashboard"
          description="Không tải được số liệu tổng quan. Danh sách công việc vẫn tải độc lập; bạn có thể bấm Tải lại để thử lại."
        />
      )}

      {!metricsLoading && !error && data.role === 'admin' && (
        <>
          <Row className="crm-summary-grid crm-dashboard-kpis" gutter={[16, 16]}>
            <KpiCard title="Lead mới trong tháng" value={kpis.newLeads || 0} prefix={<UserAddOutlined />} to={data.links?.newLeads} caption="Theo ngày tạo Lead" note="Theo ngày tạo, bao gồm mọi trạng thái" />
            <KpiCard title="Tỷ lệ đăng ký" value={kpis.conversionRate || 0} prefix={<RiseOutlined />} suffix="%" to={data.links?.conversionRate} caption="Đã đăng ký / tổng Lead" note="Đã đăng ký / tổng Lead" />
            <KpiCard title="Học viên đang học" value={kpis.activeStudents || 0} prefix={<TeamOutlined />} caption="Hồ sơ đang hoạt động" />
            <KpiCard title="Doanh thu tháng" value={kpis.monthRevenue || 0} prefix={<DollarOutlined />} currency caption="Theo giao dịch thanh toán" />
          </Row>

          <Row className="crm-dashboard-row" gutter={[16, 16]}>
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

        </>
      )}

      {role === 'admin' && (
        <>
          <Row className="crm-dashboard-row" gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DashboardCard title="Nguồn lead">
                {metricsLoading ? <div className="flex h-[260px] items-center justify-center"><Spin /></div>
                  : error ? <Alert type="warning" showIcon message="Chưa tải được số liệu nguồn Lead" />
                  : data.charts?.leadSources?.length ? (
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
              <DashboardWorkCard key={scope} revision={revision} alerts={summaryAlerts} overviewError={!!error} />
            </Col>
          </Row>

          {!metricsLoading && !error && <Row gutter={[16, 16]}>
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
          </Row>}
        </>
      )}

      {!metricsLoading && !error && data.role === 'sale' && (
          <Row className="crm-summary-grid crm-dashboard-kpis" gutter={[16, 16]}>
            <KpiCard title="Lead của tôi" value={kpis.myLeads || 0} prefix={<UserAddOutlined />} to={data.links?.myLeads} caption="Lead đang được phân công" />
            <KpiCard title="Cần chăm sóc" value={kpis.needsCare || 0} prefix={<PhoneOutlined />} to={data.links?.needsCare} caption="Chưa liên hệ hoặc quá 3 ngày" note="Chưa liên hệ hoặc đã quá 3 ngày" />
            <KpiCard title="Tỷ lệ đăng ký" value={kpis.conversionRate || 0} prefix={<RiseOutlined />} suffix="%" to={data.links?.conversionRate} caption="Trong Lead đang phụ trách" note="Đã đăng ký / tổng Lead của tôi" />
            <KpiCard title="Công nợ cần thu" value={kpis.debtToCollect || 0} prefix={<DollarOutlined />} currency
              to={data.links?.debtToCollect} caption="Trong phạm vi phụ trách" note="Học viên từ Lead đang phụ trách" />
          </Row>
      )}

      {!metricsLoading && !error && data.role === 'teacher' && (
          <Row className="crm-summary-grid crm-dashboard-kpis crm-teacher-kpis" gutter={[16, 16]}>
            <KpiCard title="Lớp phụ trách" value={kpis.activeClasses || 0} prefix={<BookOutlined />} to="/lms/classes" caption="Đang học và sắp mở" note="Lớp đang học và sắp mở do bạn phụ trách" />
            <KpiCard title="Học viên phụ trách" value={kpis.students || 0} prefix={<TeamOutlined />} to="/lms/students" caption="Trong các lớp phụ trách" />
            <KpiCard title="Buổi dạy / 7 ngày" value={kpis.sessionsThisWeek || 0} prefix={<CalendarOutlined />} caption="Từ hôm nay" note="Từ hôm nay, không gồm buổi nghỉ/hủy" />
            <KpiCard title="Tỷ lệ tham gia" value={kpis.attendanceRate ?? null} prefix={<CheckCircleOutlined />} suffix="%" caption="Các buổi đã kết thúc" note={attendanceNote} />
          </Row>
      )}

      {!metricsLoading && !error && data.role === 'student' && (
          <Row className="crm-summary-grid crm-dashboard-kpis" gutter={[16, 16]}>
            <KpiCard title="Tỷ lệ tham gia" value={kpis.attendanceRate ?? null} prefix={<CheckCircleOutlined />} suffix="%" caption="Các buổi đã kết thúc" note={attendanceNote} />
            <KpiCard title="Buổi đã tham gia" value={kpis.attendedSessions || 0} prefix={<BookOutlined />} caption="Có mặt và đi muộn" note="Có mặt + đi muộn" />
            <KpiCard title="Buổi vắng không phép" value={kpis.absentSessions || 0} prefix={<CloseCircleOutlined />} caption="Theo điểm danh đã ghi nhận" />
            <KpiCard title="Bài tập thiếu / muộn" value={kpis.missingAssignments || 0} prefix={<FileTextOutlined />} caption="Chưa nộp hoặc nộp muộn" />
          </Row>
      )}
      {role !== 'admin' && <Row gutter={[16, 16]}>
        <Col xs={24} lg={role === 'teacher' ? 15 : 16} className="crm-dashboard-stack">
          {metricsLoading && <Card><div className="flex min-h-[160px] items-center justify-center"><Spin /></div></Card>}
          {error && <DashboardCard title="Tổng quan"><EmptyState text="Chưa tải được nội dung tổng quan" /></DashboardCard>}
          {overviewReady && role === 'sale' && <>
            <DashboardCard title="Phân bố trạng thái Lead" extra={<Link to="/crm/leads?tab=funnel">Xem báo cáo</Link>}>
              <LeadStatusSummary data={funnelData} error={funnelError} />
            </DashboardCard>
            <DashboardCard title="Hoạt động gần đây">
              {data.activities?.length ? <Timeline items={data.activities.map(item => ({ children: <div>
                <strong>{item.actor}</strong> {item.text} · {formatTime(item.time)}
                {item.action && <Button type="link" size="small" onClick={() => openDetail(item.action!)}>Xem Lead</Button>}
              </div> }))} /> : <EmptyState text="Chưa có hoạt động gần đây" />}
            </DashboardCard>
          </>}
          {overviewReady && role === 'teacher' && <>
            <DashboardCard title="Lịch dạy" extra={<Link to="/lms/myschedule">Xem toàn bộ lịch</Link>}>
              <TeacherSchedule items={teacherSessions} todayIds={(lists.todayClasses || []).map((item: any) => item.id)}
                onOpen={id => openDetail(`/lms/sessions/${id}`)} />
            </DashboardCard>
          </>}
          {overviewReady && role === 'student' && <>
            <DashboardCard title="Lịch học trong 7 ngày" extra={<Link to="/lms/myschedule">Xem lịch</Link>}>
              <DashboardSchedule items={lists.weekSchedule || []} nextId={lists.nextClass?.id}
                onOpen={id => openDetail(`/lms/sessions/${id}`)} />
            </DashboardCard>
            <DashboardCard title="Tiến độ lớp học"><StudentProgress classes={lists.classProgress} /></DashboardCard>
          </>}
        </Col>
        <Col xs={24} lg={role === 'teacher' ? 9 : 8} className="crm-dashboard-stack">
          <DashboardWorkCard key={scope} revision={revision} alerts={summaryAlerts}
            onReload={role === 'teacher' ? () => setRevision(value => value + 1) : undefined}
            extraGroup={overviewReady && role === 'teacher' ? { title: 'Học viên cần hỗ trợ', count: kpis.supportCases || 0, content: <>
              <List className="crm-dashboard-list" dataSource={lists.attentionStudents || []} rowKey="id"
              locale={{ emptyText: 'Chưa có học viên cần hỗ trợ' }}
              pagination={(lists.attentionStudents || []).length > 3 ? paginationProps('học viên theo lớp', { pageSize: 3, showSizeChanger: false }) : false}
              renderItem={(item: any) => <List.Item actions={[<Button key="support" type="link" size="small" onClick={() => openDetail(item.action)}>Xem hồ sơ</Button>]}>
                <div className="min-w-0"><div className="crm-dashboard-item-title"><strong>{item.name}</strong><SupportPriority data={item.risk} /></div>
                  <div className="crm-dashboard-meta">{item.className}</div></div>
              </List.Item>} />
              <Link className="mt-4 inline-block" to={data.links?.dropoutAttention || '/ai/predictions?risk_level=attention'}>Xem tất cả trường hợp cần hỗ trợ</Link>
            </> } : undefined} />
          {overviewReady && role === 'student' && <DashboardCard title="Học phí gần đây" extra={<Link to="/lms/my-profile?tab=finance">Xem tất cả</Link>}>
            <List className="crm-dashboard-list" dataSource={lists.invoices || []} rowKey="id"
              locale={{ emptyText: 'Chưa có khoản học phí' }}
              pagination={(lists.invoices || []).length > 3 ? paginationProps('khoản thu', { pageSize: 3, showSizeChanger: false }) : false}
              renderItem={(item: any) => <List.Item><div className="w-full min-w-0">
                <strong>{item.className || item.title}</strong>
                <div className="crm-dashboard-meta">{item.className && <span>{item.title}</span>}<span>Hạn: {formatDate(item.dueDate) || 'Chưa có'}</span></div>
                <div className="crm-dashboard-meta">Phải thu: {formatCurrency(item.amount || 0)}</div>
                <div className="crm-dashboard-item-title mt-1"><span>Còn lại: <strong>{formatCurrency(item.remainingAmount || 0)}</strong></span><BillingStatusTag status={item.status} /></div>
              </div></List.Item>} />
          </DashboardCard>}
          {overviewReady && role === 'student' && <DashboardCard title="Tài liệu mới">
            <List className="crm-dashboard-list" dataSource={lists.materials || []} rowKey="id"
              locale={{ emptyText: 'Chưa có tài liệu' }}
              renderItem={(item: any) => <List.Item actions={[<Button key="material" type="link" size="small" disabled={!item.classId}
                onClick={() => openDetail(`/lms/classes/${item.classId}?tab=materials`)}>Mở lớp</Button>]}>
                <div className="min-w-0"><div>{item.title}</div><div className="crm-dashboard-meta">{formatDate(item.date)}</div></div>
              </List.Item>} />
          </DashboardCard>}
        </Col>
      </Row>}
      {overviewReady && role === 'teacher' && <DashboardCard title="Tài liệu gần đây" extra={<Link to="/lms/classes">Lớp phụ trách</Link>}>
        <TeacherMaterials key={scope} items={lists.materials || []} onOpen={openDetail} />
      </DashboardCard>}
    </div>
  );
}

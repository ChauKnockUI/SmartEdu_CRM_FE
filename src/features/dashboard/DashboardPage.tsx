import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, List, Timeline, Button, Alert, Progress, Space, Badge, Calendar } from 'antd';
import {
  UserAddOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  CalendarOutlined,
  WarningOutlined,
  TrophyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockLeads, mockStudents, mockSessions, mockPayments } from '../../services/mock/mockData';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DashboardPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Calculate KPIs
  const newLeadsCount = mockLeads.filter(l => l.status === 'new').length;
  const conversionRate = (mockLeads.filter(l => l.status === 'converted').length / mockLeads.length * 100).toFixed(1);
  const activeStudents = mockStudents.filter(s => s.status === 'active').length;
  const monthRevenue = mockPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Revenue by month data
  const revenueData = [
    { month: 'T10/2025', revenue: 125000000 },
    { month: 'T11/2025', revenue: 145000000 },
    { month: 'T12/2025', revenue: 160000000 },
    { month: 'T1/2026', revenue: 155000000 },
    { month: 'T2/2026', revenue: 170000000 },
    { month: 'T3/2026', revenue: 185000000 },
  ];

  // Leads by source
  const leadsBySource = [
    { name: 'Facebook Ads', value: 45 },
    { name: 'Google Ads', value: 30 },
    { name: 'Website', value: 15 },
    { name: 'Referral', value: 10 },
  ];

  // ADMIN DASHBOARD
  if (role === 'admin') {
    return (
      <div>
        <PageHeader 
          title={`Chào mừng, ${user?.name}`}
          subtitle="Tổng quan hệ thống EduCRM"
        />

        {/* KPI Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Leads mới (tháng này)"
                value={newLeadsCount}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#3f8600' }}
                suffix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tỉ lệ chuyển đổi"
                value={conversionRate}
                prefix={<RiseOutlined />}
                suffix="%"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Học viên đang học"
                value={activeStudents}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Doanh thu tháng"
                value={monthRevenue}
                prefix={<DollarOutlined />}
                suffix="đ"
                precision={0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Revenue Chart */}
          <Col xs={24} lg={12}>
            <Card title="Doanh thu 6 tháng gần nhất">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${(value / 1000000).toFixed(0)}M đ`} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Leads by Source */}
          <Col xs={24} lg={12}>
            <Card title="Nguồn Leads">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadsBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leadsBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-6">
          {/* System Alerts */}
          <Col xs={24} lg={12}>
            <Card title="Cảnh báo hệ thng" extra={<Badge count={5} />}>
              <List
                dataSource={[
                  { id: 'alert-1', type: 'warning', title: '5 học viên có nguy cơ nghỉ học cao', action: '/ai/predictions' },
                  { id: 'alert-2', type: 'error', title: '12 học phí quá hạn chưa thu', action: '/finance/payments' },
                  { id: 'alert-3', type: 'info', title: '3 lớp sắp đầy (>80% sĩ số)', action: '/lms/classes' },
                  { id: 'alert-4', type: 'warning', title: '8 leads chưa follow-up >3 ngày', action: '/crm/leads' },
                ]}
                rowKey="id"
                renderItem={(item: any) => (
                  <List.Item
                    actions={[<Button key="view" type="link">Xem</Button>]}
                  >
                    <List.Item.Meta
                      avatar={<WarningOutlined className={`text-${item.type === 'error' ? 'red' : item.type === 'warning' ? 'orange' : 'blue'}-500 text-xl`} />}
                      title={item.title}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Recent Activities */}
          <Col xs={24} lg={12}>
            <Card title="Hoạt động gần đây">
              <Timeline
                items={[
                  { children: <div><strong>Sale 1</strong> đã chuyển đổi lead thành công - 10:30</div> },
                  { children: <div><strong>Teacher A</strong> hoàn thành điểm danh lớp IELTS 6.5 - 09:00</div> },
                  { children: <div><strong>Admin</strong> thêm 3 học viên vào lớp TOEIC - 08:45</div> },
                  { children: <div><strong>System</strong> gửi nhắc học phí cho 15 học viên - 08:00</div> },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // SALE DASHBOARD
  if (role === 'sale') {
    const myLeads = mockLeads.slice(0, 5);
    const followUpToday = 8;
    const myConversionRate = 32;

    return (
      <div>
        <PageHeader 
          title={`Chào ${user?.name}`}
          subtitle="Dashboard Sale - Theo dõi leads và CSKH"
        />

        {/* Sale KPIs */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Leads của tôi"
                value={myLeads.length}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Follow-up hôm nay"
                value={followUpToday}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tỉ lệ chuyển đổi (tháng)"
                value={myConversionRate}
                suffix="%"
                prefix={<RiseOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Công nợ cần thu"
                value={45000000}
                suffix="đ"
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* My Leads */}
          <Col xs={24} lg={12}>
            <Card 
              title="Leads ưu tiên (Score cao)" 
              extra={<Button type="primary" onClick={() => navigate('/crm/leads')}>Xem tất cả</Button>}
            >
              <List
                dataSource={myLeads.sort((a, b) => b.score - a.score).slice(0, 5)}
                rowKey="id"
                renderItem={(lead) => (
                  <List.Item
                    actions={[
                      <Button key="call" type="link" icon={<PhoneOutlined />}>Gọi ngay</Button>,
                      <Button key="detail" type="link" onClick={() => navigate(`/crm/leads/${lead.id}`)}>Chi tiết</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {lead.name}
                          <Tag color={lead.score >= 80 ? 'green' : lead.score >= 60 ? 'orange' : 'default'}>
                            Score: {lead.score}
                          </Tag>
                        </Space>
                      }
                      description={`${lead.phone} - ${lead.source}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Follow-up Schedule */}
          <Col xs={24} lg={12}>
            <Card title="Lịch follow-up hôm nay">
              <Timeline
                items={[
                  { 
                    color: 'red',
                    children: <div><strong>09:30</strong> - Gọi lại Nguyễn Văn A (Lead hot, score 92)</div> 
                  },
                  { 
                    color: 'blue',
                    children: <div><strong>11:00</strong> - Gọi nhắc học phí Trần Thị B (Quá hạn 5 ngày)</div> 
                  },
                  { 
                    color: 'green',
                    children: <div><strong>14:00</strong> - Gặp học viên Lê Văn C (Tư vấn khóa tiếp theo)</div> 
                  },
                  { 
                    color: 'orange',
                    children: <div><strong>16:30</strong> - Follow-up lead Phạm Thị D (Lần 2)</div> 
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-6">
          {/* Students with Payment Issues */}
          <Col xs={24} lg={12}>
            <Card title="Học viên cần thu học phí" extra={<Badge count={12} />}>
              <List
                dataSource={[
                  { id: 'payment-1', name: 'Trần Thị B', amount: 5000000, overdue: 5 },
                  { id: 'payment-2', name: 'Lê Văn E', amount: 4500000, overdue: 3 },
                  { id: 'payment-3', name: 'Phạm Thị F', amount: 5000000, overdue: 7 },
                ]}
                rowKey="id"
                renderItem={(item: any) => (
                  <List.Item
                    actions={[
                      <Button type="link" icon={<PhoneOutlined />}>Gọi ngay</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {item.name}
                          <Tag color="red">Quá hạn {item.overdue} ngày</Tag>
                        </Space>
                      }
                      description={`Công nợ: ${item.amount.toLocaleString('vi-VN')} đ`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Upsell Opportunities */}
          <Col xs={24} lg={12}>
            <Card title="Cơ hội Upsell" extra={<Badge count={5} />}>
              <List
                dataSource={[
                  { name: 'Nguyễn Văn G', current: 'IELTS 6.5', next: 'IELTS 7.0', progress: 85 },
                  { name: 'Trần Thị H', current: 'TOEIC 650', next: 'TOEIC 850', progress: 90 },
                  { name: 'Lê Văn I', current: 'Basic English', next: 'IELTS Foundation', progress: 80 },
                ]}
                renderItem={(item) => (
                  <List.Item
                    actions={[<Button key="advise" type="link">Tư vấn</Button>]}
                  >
                    <List.Item.Meta
                      title={item.name}
                      description={
                        <div>
                          <div>Đang học: {item.current}</div>
                          <div className="mt-1">
                            <Space>
                              <span className="text-xs">Tiến độ:</span>
                              <Progress percent={item.progress} size="small" style={{ width: 100 }} />
                            </Space>
                          </div>
                          <div className="text-green-600 mt-1">→ Gợi ý: {item.next}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // TEACHER DASHBOARD
  if (role === 'teacher') {
    const todayClasses = [
      { id: 'c1', name: 'IELTS 6.5 - Lớp A1', time: '08:00-10:00', room: 'P301', students: 15 },
      { id: 'c2', name: 'TOEIC 650 - Lớp B2', time: '14:00-16:00', room: 'P205', students: 12 },
    ];

    return (
      <div>
        <PageHeader 
          title={`Chào Thầy/Cô ${user?.name}`}
          subtitle="Dashboard Giảng viên - Lịch dạy và điểm danh"
        />

        {/* Today's Classes Alert */}
        <Alert
          message={`Hôm nay bạn có ${todayClasses.length} buổi dạy`}
          description="Lớp đầu tiên bắt đầu lúc 08:00"
          type="info"
          showIcon
          className="mb-6"
        />

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Lớp đang dạy"
                value={5}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Học viên"
                value={68}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Buổi dạy tuần này"
                value={12}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tỉ lệ đi học TB"
                value={87}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Today's Schedule */}
          <Col xs={24} lg={12}>
            <Card title="Lịch dạy hôm nay">
              <List
                dataSource={todayClasses}
                renderItem={(classItem) => (
                  <List.Item
                    actions={[
                      <Button type="primary" icon={<CheckCircleOutlined />}>Điểm danh</Button>,
                      <Button type="link" onClick={() => navigate(`/lms/classes/${classItem.id}`)}>Chi tiết</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<CalendarOutlined className="text-2xl text-blue-500" />}
                      title={<div className="font-semibold">{classItem.name}</div>}
                      description={
                        <div>
                          <div>⏰ {classItem.time}</div>
                          <div>📍 {classItem.room}</div>
                          <div>👥 {classItem.students} học viên</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Students Need Attention */}
          <Col xs={24} lg={12}>
            <Card title="Học viên cần chú ý" extra={<Badge count={6} />}>
              <List
                dataSource={[
                  { name: 'Nguyễn Văn A', issue: 'Vắng 3 buổi liên tiếp', severity: 'high' },
                  { name: 'Trần Thị B', issue: 'Tiến bộ chậm - Writing 5.0', severity: 'medium' },
                  { name: 'Lê Văn C', issue: 'Churn risk: 65%', severity: 'high' },
                  { name: 'Phạm Thị D', issue: 'Muộn thường xuyên', severity: 'low' },
                ]}
                renderItem={(item) => (
                  <List.Item
                    actions={[<Button type="link">Xem</Button>]}
                  >
                    <List.Item.Meta
                      avatar={
                        <WarningOutlined 
                          className={`text-xl ${
                            item.severity === 'high' ? 'text-red-500' : 
                            item.severity === 'medium' ? 'text-orange-500' : 
                            'text-yellow-500'
                          }`} 
                        />
                      }
                      title={item.name}
                      description={item.issue}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-6">
          {/* Upcoming Sessions */}
          <Col xs={24} lg={12}>
            <Card title="Buổi dạy sắp tới (tuần này)">
              <Timeline
                items={[
                  { 
                    color: 'blue',
                    children: <div><strong>Thứ 3, 31/03</strong> - IELTS 6.5 A1 (08:00-10:00)</div> 
                  },
                  { 
                    color: 'blue',
                    children: <div><strong>Thứ 4, 01/04</strong> - TOEIC 650 B2 (14:00-16:00)</div> 
                  },
                  { 
                    color: 'blue',
                    children: <div><strong>Thứ 5, 02/04</strong> - IELTS 7.0 A2 (19:00-21:00)</div> 
                  },
                  { 
                    color: 'blue',
                    children: <div><strong>Thứ 6, 03/04</strong> - IELTS 6.5 A1 (08:00-10:00)</div> 
                  },
                ]}
              />
            </Card>
          </Col>

          {/* Materials & Notes */}
          <Col xs={24} lg={12}>
            <Card 
              title="Tài liệu & Ghi chú"
              extra={<Button type="primary" icon={<FileTextOutlined />}>Thêm tài liệu</Button>}
            >
              <List
                dataSource={[
                  { title: 'Ghi chú buổi học 29/03 - IELTS 6.5 A1', type: 'note', date: '29/03/2026' },
                  { title: 'Practice Test - Reading.pdf', type: 'material', date: '27/03/2026' },
                  { title: 'Ghi chú buổi học 26/03 - TOEIC 650 B2', type: 'note', date: '26/03/2026' },
                ]}
                renderItem={(item) => (
                  <List.Item
                    actions={[<Button key="view-material" type="link">Xem</Button>]}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined className="text-xl text-blue-500" />}
                      title={item.title}
                      description={item.date}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // STUDENT DASHBOARD
  if (role === 'student') {
    const myNextClass = {
      name: 'IELTS 6.5 - Lớp A1',
      date: 'Thứ 2, 01/04/2026',
      time: '19:00-21:00',
      room: 'P301',
      teacher: 'Nguyễn Văn A',
    };

    return (
      <div>
        <PageHeader 
          title={`Chào ${user?.name}`}
          subtitle="Chào mừng bạn đến với hệ thống học tập"
        />

        {/* Next Class Alert */}
        <Alert
          message={`Buổi học tiếp theo: ${myNextClass.date}`}
          description={`${myNextClass.name} - ${myNextClass.time} tại ${myNextClass.room}`}
          type="info"
          showIcon
          icon={<CalendarOutlined />}
          className="mb-6"
          action={
            <Button type="primary" size="small">
              Xem chi tiết
            </Button>
          }
        />

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tỉ lệ tham gia"
                value={85}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Buổi đã học"
                value={34}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Buổi vắng"
                value={6}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Bài tập chưa nộp"
                value={2}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* My Schedule */}
          <Col xs={24} lg={12}>
            <Card title="Lịch học tuần này">
              <Timeline
                items={[
                  { 
                    color: 'blue',
                    children: (
                      <div>
                        <div className="font-semibold">Thứ 2, 01/04 - 19:00-21:00</div>
                        <div className="text-gray-600">IELTS 6.5 - P301</div>
                      </div>
                    )
                  },
                  { 
                    color: 'blue',
                    children: (
                      <div>
                        <div className="font-semibold">Thứ 4, 03/04 - 19:00-21:00</div>
                        <div className="text-gray-600">IELTS 6.5 - P301</div>
                      </div>
                    )
                  },
                  { 
                    color: 'blue',
                    children: (
                      <div>
                        <div className="font-semibold">Thứ 6, 05/04 - 19:00-21:00</div>
                        <div className="text-gray-600">IELTS 6.5 - P301</div>
                      </div>
                    )
                  },
                ]}
              />
            </Card>
          </Col>

          {/* Learning Progress */}
          <Col xs={24} lg={12}>
            <Card title="Tiến độ học tập">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Hoàn thành khóa học</span>
                    <span className="font-semibold">68%</span>
                  </div>
                  <Progress percent={68} strokeColor="#1890ff" />
                  <p className="text-sm text-gray-600 mt-1">34/50 buổi học</p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Mục tiêu IELTS</span>
                    <span className="font-semibold">6.5</span>
                  </div>
                  <Progress percent={75} strokeColor="#52c41a" />
                  <p className="text-sm text-gray-600 mt-1">Trình độ hiện tại: 5.5 → Mục tiêu: 6.5</p>
                </div>

                <div className="bg-blue-50 p-4 rounded mt-4">
                  <h4 className="font-semibold mb-2">💪 Động viên từ giảng viên:</h4>
                  <p className="text-gray-700 italic">
                    "Bạn đang tiến bộ rất tốt! Speaking đã cải thiện đáng kể. Hãy tiếp tục duy trì và chú ý thêm phần Writing Task 2."
                  </p>
                  <p className="text-sm text-gray-600 mt-2">- Teacher Nguyễn Văn A</p>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-6">
          {/* Payments */}
          <Col xs={24} lg={12}>
            <Card title="Học phí">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <div>
                    <div className="font-semibold">Học phí tháng 3/2026</div>
                    <div className="text-sm text-gray-600">Hạn: 25/03/2026</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">5,000,000 đ</div>
                    <Tag color="success">Đã thanh toán</Tag>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-3 border-b">
                  <div>
                    <div className="font-semibold">Học phí tháng 4/2026</div>
                    <div className="text-sm text-gray-600">Hạn: 25/04/2026</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">5,000,000 đ</div>
                    <Tag color="orange">Chưa thanh toán</Tag>
                  </div>
                </div>

                <Button type="primary" block>
                  Xem lịch sử thanh toán
                </Button>
              </div>
            </Card>
          </Col>

          {/* Homework & Materials */}
          <Col xs={24} lg={12}>
            <Card title="Bài tập & Tài liệu">
              <List
                dataSource={[
                  { title: 'Bài tập về nhà - Reading Practice', due: '03/04/2026', status: 'pending' },
                  { title: 'Vocabulary Week 5-8.xlsx', type: 'material' },
                  { title: 'Bài tập tuần 4 - Writing Task 2', due: '30/03/2026', status: 'submitted' },
                  { title: 'IELTS Reading Strategies.pdf', type: 'material' },
                ]}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      item.status ? (
                        item.status === 'pending' ? (
                          <Button type="primary" size="small">Nộp bài</Button>
                        ) : (
                          <Tag color="success">Đã nộp</Tag>
                        )
                      ) : (
                        <Button type="link" size="small">Tải xuống</Button>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined className="text-xl text-blue-500" />}
                      title={item.title}
                      description={item.due ? `Hạn nộp: ${item.due}` : 'Tài liệu học tập'}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row gutter={[16, 16]} className="mt-6">
          <Col xs={24}>
            <Card title="Liên hệ hỗ trợ">
              <Space size="large">
                <Button type="primary" icon={<PhoneOutlined />} size="large">
                  Gọi trung tâm
                </Button>
                <Button icon={<FileTextOutlined />} size="large">
                  Gửi phản hồi
                </Button>
                <Button icon={<CalendarOutlined />} size="large">
                  Đặt lịch tư vấn
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return <div>Loading...</div>;
}
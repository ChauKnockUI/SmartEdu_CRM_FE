import React, { useState } from 'react';
import { Card, Tabs, Descriptions, Tag, Table, Button, Space, Modal, Form, Input, Select, DatePicker, TimePicker, message, Alert, Progress, Divider, Badge, Checkbox, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, UserAddOutlined, CalendarOutlined, CheckCircleOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useNavigate } from 'react-router';
import { mockClasses, mockSessions, mockStudents } from '../../services/mock/mockData';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';

// Mock enrollments
const mockEnrollments = [
  { id: 'e1', studentId: 's1', studentName: 'Nguyễn Văn A', status: 'active', attendanceRate: 90 },
  { id: 'e2', studentId: 's2', studentName: 'Trần Thị B', status: 'active', attendanceRate: 85 },
  { id: 'e3', studentId: 's3', studentName: 'Lê Văn C', status: 'active', attendanceRate: 75 },
  { id: 'e4', studentId: 's4', studentName: 'Phạm Thị D', status: 'paused', attendanceRate: 60 },
];

// Mock attendance records for students
const mockAttendanceRecords = [
  { sessionId: 'sess1', studentId: 's1', status: 'present', date: new Date(2026, 2, 24) },
  { sessionId: 'sess2', studentId: 's1', status: 'absent', date: new Date(2026, 2, 26) },
  { sessionId: 'sess3', studentId: 's1', status: 'present', date: new Date(2026, 2, 28) },
  { sessionId: 'sess4', studentId: 's1', status: 'late', date: new Date(2026, 2, 31) },
];

export function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const permissions = usePermissions();
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [form] = Form.useForm();
  const [attendanceForm] = Form.useForm();

  const classItem = mockClasses.find(c => c.id === id);

  if (!classItem) {
    return <div>Lớp học không tồn tại</div>;
  }

  const classSessions = mockSessions.filter(s => s.class_id === id);

  const handleCreateSession = (values: any) => {
    message.success('Đã tạo buổi học');
    setSessionModalVisible(false);
    form.resetFields();
  };

  const handleAddEnrollment = (values: any) => {
    message.success('Đã thêm học viên vào lớp');
    setEnrollModalVisible(false);
  };

  const handleAddMaterial = (values: any) => {
    message.success('Đã thêm tài liệu');
    setMaterialModalVisible(false);
  };

  const handleOpenAttendance = (session: any) => {
    setSelectedSession(session);
    setAttendanceModalVisible(true);
    // Initialize form with default values - all students present
    const initialAttendance: any = {};
    mockEnrollments.forEach(enrollment => {
      initialAttendance[enrollment.id] = 'present';
    });
    attendanceForm.setFieldsValue({
      attendance: initialAttendance,
      content: '',
      notes: '',
    });
  };

  const handleSubmitAttendance = (values: any) => {
    console.log('Attendance data:', values);
    
    // Count attendance stats
    const attendanceValues = Object.values(values.attendance || {});
    const presentCount = attendanceValues.filter(v => v === 'present').length;
    const absentCount = attendanceValues.filter(v => v === 'absent').length;
    const lateCount = attendanceValues.filter(v => v === 'late').length;
    
    message.success(`Đã lưu điểm danh: ${presentCount} có mặt, ${absentCount} vắng, ${lateCount} muộn`);
    setAttendanceModalVisible(false);
    attendanceForm.resetFields();
  };

  // Build tabs based on role
  const buildTabItems = () => {
    const tabs = [];

    // Overview tab - all roles
    tabs.push({
      key: 'overview',
      label: 'Tổng quan',
      children: (
        <Card
          extra={
            permissions.canEditClassDetails && (
              <Button icon={<EditOutlined />}>Chỉnh sửa</Button>
            )
          }
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Tên lớp">{classItem.name}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={classItem.status === 'active' ? 'green' : classItem.status === 'completed' ? 'default' : 'blue'}>
                {classItem.status === 'active' ? 'Đang học' : classItem.status === 'completed' ? 'Đã kết thúc' : 'Sắp mở'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Giảng viên">{classItem.teacher_id}</Descriptions.Item>
            <Descriptions.Item label="Sĩ số">
              {mockEnrollments.filter(e => e.status === 'active').length} / {classItem.maxStudents}
            </Descriptions.Item>
            <Descriptions.Item label="Lịch học">{classItem.schedule}</Descriptions.Item>
            <Descriptions.Item label="Phòng / Link">{classItem.room || 'Online'}</Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">
              {classItem.start_date?.toLocaleDateString?.('vi-VN') || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {classItem.end_date?.toLocaleDateString?.('vi-VN') || 'N/A'}
            </Descriptions.Item>
            {(role === 'admin' || role === 'sale') && (
              <Descriptions.Item label="Học phí gói">
                5,000,000  / khóa
              </Descriptions.Item>
            )}
          </Descriptions>

          {role === 'admin' && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Dashboard lớp học</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">82%</div>
                    <div className="text-gray-600 mt-1">Tỉ lệ đi học TB</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">15%</div>
                    <div className="text-gray-600 mt-1">Churn Risk TB</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">20M đ</div>
                    <div className="text-gray-600 mt-1">Doanh thu lớp</div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>
      ),
    });

    // Students/Enrollments tab
    tabs.push({
      key: 'students',
      label: 'Học viên',
      children: (
        <Card
          extra={
            permissions.canManageEnrollments && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setEnrollModalVisible(true)}
              >
                Thêm học viên
              </Button>
            )
          }
        >
          {role === 'sale' && (
            <Alert
              message="Theo dõi học phí"
              description="3 học viên còn nợ học phí. Cần gọi nhắc thanh toán."
              type="warning"
              showIcon
              closable
              className="mb-4"
            />
          )}

          <Table
            dataSource={mockEnrollments}
            rowKey="id"
            columns={[
              {
                title: 'Học viên',
                dataIndex: 'studentName',
                key: 'studentName',
                render: (name: string, record: any) => (
                  <Button
                    type="link"
                    onClick={() => navigate(`/lms/students/${record.studentId}`)}
                  >
                    {name}
                  </Button>
                ),
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? 'Đang học' : 'Tạm nghỉ'}
                  </Tag>
                ),
              },
              {
                title: 'Tỉ lệ đi học',
                dataIndex: 'attendanceRate',
                key: 'attendanceRate',
                render: (rate: number) => (
                  <div>
                    <Progress
                      percent={rate}
                      size="small"
                      strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#f5222d'}
                    />
                  </div>
                ),
              },
              ...(role === 'sale' ? [{
                title: 'Học phí',
                key: 'payment',
                render: () => (
                  <Tag color="green">Đã đóng</Tag>
                ),
              }] : []),
              ...(permissions.canManageEnrollments ? [{
                title: 'Thao tác',
                key: 'action',
                render: (_: any, record: any) => (
                  <Space size="small">
                    <Button type="link" size="small">Xem</Button>
                    {record.status === 'active' && (
                      <Button type="link" size="small" danger>Tạm dừng</Button>
                    )}
                  </Space>
                ),
              }] : []),
            ]}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    });

    // Sessions tab - all roles
    tabs.push({
      key: 'sessions',
      label: 'Lịch buổi học',
      children: (
        <Card
          extra={
            permissions.canCreateSessions && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setSessionModalVisible(true)}
              >
                Tạo buổi học
              </Button>
            )
          }
        >
          {role === 'teacher' && (
            <div className="mb-4">
              <Alert
                message="Buổi học sắp tới"
                description="Buổi học tiếp theo: Thứ 2, 01/04/2026 - 19:00-21:00 (P301)"
                type="info"
                showIcon
              />
            </div>
          )}

          <Table
            dataSource={classSessions}
            rowKey="id"
            columns={[
              {
                title: 'Buổi',
                key: 'session',
                render: (_: any, __: any, index: number) => `Buổi ${index + 1}`,
              },
              {
                title: 'Ngày',
                dataIndex: 'date',
                key: 'date',
                render: (date: Date) => date.toLocaleDateString('vi-VN'),
              },
              {
                title: 'Thời gian',
                key: 'time',
                render: (_: any, record: any) => `${record.startTime} - ${record.endTime}`,
              },
              ...(role !== 'student' ? [{
                title: 'Giảng viên',
                dataIndex: 'teacherName',
                key: 'teacherName',
              }] : []),
              {
                title: 'Phòng',
                key: 'room',
                render: () => 'P301',
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={status === 'completed' ? 'green' : status === 'cancelled' ? 'red' : 'blue'}>
                    {status === 'completed' ? 'Đã học' : status === 'cancelled' ? 'Đã hủy' : 'Đã lên lịch'}
                  </Tag>
                ),
              },
              ...(role === 'teacher' ? [{
                title: 'Điểm danh',
                key: 'attendance',
                render: (_: any, record: any) => {
                  if (record.status === 'completed') {
                    return <Tag icon={<CheckCircleOutlined />} color="success">Đã điểm danh</Tag>;
                  }
                  if (record.status === 'scheduled') {
                    return (
                      <Button 
                        type="primary" 
                        size="small" 
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleOpenAttendance(record)}
                      >
                        Điểm danh
                      </Button>
                    );
                  }
                  return '-';
                },
              }] : []),
              {
                title: 'Thao tác',
                key: 'actions',
                render: (_: any, record: any) => (
                  <Space size="small">
                    <Button type="link" size="small" onClick={() => navigate(`/lms/sessions/${record.id}`)}>
                      Chi tiết
                    </Button>
                  </Space>
                ),
              },
            ]}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    });

    // Attendance summary - admin and teacher
    if (role === 'admin' || role === 'teacher') {
      tabs.push({
        key: 'attendance',
        label: 'Tổng hợp điểm danh',
        children: (
          <Card>
            <div className="mb-4">
              <h3 className="font-semibold mb-3">Tổng quan</h3>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">82%</div>
                    <div className="text-gray-600 mt-1">Tỉ lệ tham gia TB</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">245</div>
                    <div className="text-gray-600 mt-1">Tổng lượt có mặt</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">32</div>
                    <div className="text-gray-600 mt-1">Tổng lượt vắng</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">15</div>
                    <div className="text-gray-600 mt-1">Tổng lượt muộn</div>
                  </div>
                </Card>
              </div>
            </div>

            <Divider />

            <h3 className="font-semibold mb-3">Theo học viên</h3>
            <Table
              dataSource={mockEnrollments}
              rowKey="id"
              columns={[
                {
                  title: 'Học viên',
                  dataIndex: 'studentName',
                  key: 'studentName',
                },
                {
                  title: 'Có mặt',
                  key: 'present',
                  render: () => 34,
                },
                {
                  title: 'Vắng',
                  key: 'absent',
                  render: () => 6,
                },
                {
                  title: 'Muộn',
                  key: 'late',
                  render: () => 2,
                },
                {
                  title: 'Tỉ lệ',
                  dataIndex: 'attendanceRate',
                  key: 'rate',
                  render: (rate: number) => `${rate}%`,
                },
              ]}
            />
          </Card>
        ),
      });
    }

    // Materials/Notes tab
    tabs.push({
      key: 'materials',
      label: 'Tài liệu',
      children: (
        <Card
          extra={
            (role === 'admin' || role === 'teacher') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setMaterialModalVisible(true)}
              >
                Thêm tài liệu
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <div className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">IELTS Reading Strategies.pdf</h4>
                  <p className="text-sm text-gray-600">Tải lên bởi Teacher A - 25/03/2026</p>
                </div>
                <Button type="link">Tải xuống</Button>
              </div>
            </div>
            <div className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Vocabulary Week 1-4.xlsx</h4>
                  <p className="text-sm text-gray-600">Tải lên bởi Teacher A - 20/03/2026</p>
                </div>
                <Button type="link">Tải xuống</Button>
              </div>
            </div>
            <div className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Sample Essays - Band 7+.docx</h4>
                  <p className="text-sm text-gray-600">Tải lên bởi Teacher A - 15/03/2026</p>
                </div>
                <Button type="link">Tải xuống</Button>
              </div>
            </div>
          </div>
        </Card>
      ),
    });

    // Student's own attendance - only for student role
    if (role === 'student') {
      const studentId = 's1'; // Mock current student ID
      const myAttendanceRecords = mockAttendanceRecords.filter(r => r.studentId === studentId);
      
      // Join with sessions
      const attendanceWithSessions = myAttendanceRecords.map(record => {
        const session = classSessions.find(s => s.id === record.sessionId);
        return {
          ...record,
          session,
        };
      });

      const presentCount = myAttendanceRecords.filter(r => r.status === 'present').length;
      const absentCount = myAttendanceRecords.filter(r => r.status === 'absent').length;
      const lateCount = myAttendanceRecords.filter(r => r.status === 'late').length;
      const totalSessions = classSessions.filter(s => s.status === 'completed').length;
      const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

      tabs.push({
        key: 'my-attendance',
        label: 'Điểm danh của tôi',
        children: (
          <Card>
            {/* Warning for low attendance */}
            {absentCount > 2 && (
              <Alert
                message="Cảnh báo: Số buổi vắng nhiều"
                description={`Bạn đã vắng ${absentCount} buổi học. Vui lòng liên hệ giảng viên hoặc học bù.`}
                type="warning"
                showIcon
                closable
                className="mb-4"
              />
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
                  <div className="text-gray-600 mt-1">Tỉ lệ đi học</div>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                  <div className="text-gray-600 mt-1">Có mặt</div>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                  <div className="text-gray-600 mt-1">Vắng</div>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{lateCount}</div>
                  <div className="text-gray-600 mt-1">Muộn</div>
                </div>
              </Card>
            </div>

            <Divider />

            {/* Detailed attendance table */}
            <h3 className="font-semibold mb-3">Chi tiết điểm danh</h3>
            <Table
              dataSource={attendanceWithSessions}
              rowKey="sessionId"
              columns={[
                {
                  title: 'Ngày',
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: Date) => date.toLocaleDateString('vi-VN'),
                },
                {
                  title: 'Buổi học',
                  key: 'session',
                  render: (_, record: any) => record.session?.topic || 'N/A',
                },
                {
                  title: 'Thời gian',
                  key: 'time',
                  render: (_, record: any) => 
                    record.session ? `${record.session.startTime} - ${record.session.endTime}` : '-',
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => {
                    if (status === 'present') {
                      return <Tag color="green" icon={<CheckCircleOutlined />}>Có mặt</Tag>;
                    } else if (status === 'absent') {
                      return <Tag color="red">Vắng</Tag>;
                    } else if (status === 'late') {
                      return <Tag color="orange">Muộn</Tag>;
                    }
                    return <Tag>Không rõ</Tag>;
                  },
                },
              ]}
            />

            {/* Absent sessions highlight */}
            {absentCount > 0 && (
              <div className="mt-6">
                <Alert
                  message={`Các buổi đã vắng (${absentCount} buổi)`}
                  description={
                    <ul className="list-disc pl-5 mt-2">
                      {myAttendanceRecords
                        .filter(r => r.status === 'absent')
                        .map((r, idx) => (
                          <li key={idx}>
                            <strong>{r.date.toLocaleDateString('vi-VN')}</strong>
                          </li>
                        ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                />
              </div>
            )}
          </Card>
        ),
      });
    }

    return tabs;
  };

  // Build action buttons based on role
  const buildActions = () => {
    const actions: React.ReactNode[] = [];

    if (role === 'teacher') {
      actions.push(
        <Button key="attendance" type="primary" icon={<CheckCircleOutlined />}>
          Điểm danh nhanh
        </Button>,
        <Button key="notes" icon={<FileTextOutlined />}>
          Ghi chú buổi học
        </Button>,
      );
    }

    if (permissions.canEditClassDetails) {
      actions.push(
        <Button key="edit" icon={<EditOutlined />}>
          Chỉnh sửa lớp
        </Button>,
      );
    }

    if (role === 'admin') {
      actions.push(
        <Button key="sessions" icon={<CalendarOutlined />} onClick={() => setSessionModalVisible(true)}>
          Tạo buổi học hàng lot
        </Button>,
      );
    }

    return <Space>{actions}</Space>;
  };

  return (
    <div>
      <PageHeader
        title={classItem.name}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lớp học', href: '/lms/classes' },
          { title: classItem.name },
        ]}
        actions={buildActions()}
      />

      <Tabs defaultActiveKey="overview" items={buildTabItems()} />

      {/* Create Session Modal */}
      <Modal
        title="Tạo buổi học mới"
        open={sessionModalVisible}
        onCancel={() => setSessionModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSession}>
          <Form.Item name="date" label="Ngày học" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Thời gian">
            <Space>
              <Form.Item name="startTime" noStyle rules={[{ required: true }]}>
                <TimePicker format="HH:mm" placeholder="Giờ bắt đầu" />
              </Form.Item>
              <span>-</span>
              <Form.Item name="endTime" noStyle rules={[{ required: true }]}>
                <TimePicker format="HH:mm" placeholder="Giờ kết thúc" />
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item name="room" label="Phòng học">
            <Input placeholder="P301" />
          </Form.Item>

          <Form.Item name="topic" label="Chủ đề buổi học">
            <Input placeholder="IELTS Reading - Strategies" />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Ghi chú về nội dung buổi học..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Tạo buổi học
              </Button>
              <Button onClick={() => setSessionModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Enrollment Modal */}
      <Modal
        title="Thêm học viên vào lớp"
        open={enrollModalVisible}
        onCancel={() => setEnrollModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAddEnrollment}>
          <Form.Item name="studentId" label="Chọn học viên" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Tìm và chn học viên"
              options={mockStudents.map(s => ({
                label: s.full_name,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú về enrollment..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Thêm vào lớp
              </Button>
              <Button onClick={() => setEnrollModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Material Modal */}
      <Modal
        title="Thêm tài liệu"
        open={materialModalVisible}
        onCancel={() => setMaterialModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAddMaterial}>
          <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true }]}>
            <Input placeholder="IELTS Reading Strategies" />
          </Form.Item>

          <Form.Item name="file" label="File" rules={[{ required: true }]}>
            <Input type="file" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả tài liệu..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Tải lên
              </Button>
              <Button onClick={() => setMaterialModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        title={`Điểm danh buổi học - ${selectedSession ? new Date(selectedSession.date).toLocaleDateString('vi-VN') : ''}`}
        open={attendanceModalVisible}
        onCancel={() => setAttendanceModalVisible(false)}
        footer={null}
        width={900}
      >
        <Form form={attendanceForm} layout="vertical" onFinish={handleSubmitAttendance}>
          {/* Session Info */}
          <Alert
            message="Thông tin buổi học"
            description={
              <div className="space-y-1">
                <div><strong>Ngày:</strong> {selectedSession ? new Date(selectedSession.date).toLocaleDateString('vi-VN') : ''}</div>
                <div><strong>Thời gian:</strong> {selectedSession?.startTime} - {selectedSession?.endTime}</div>
                <div><strong>Phòng:</strong> P301</div>
              </div>
            }
            type="info"
            showIcon
            className="mb-4"
          />

          {/* Session Content */}
          <Form.Item 
            name="content" 
            label="Nội dung buổi học" 
            rules={[{ required: true, message: 'Vui lòng nhập nội dung buổi học' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Ví dụ: IELTS Reading - Strategies and Tips. Học chiến lược đọc hiểu, làm bài tập thực hành Reading passages..." 
            />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú thêm">
            <Input.TextArea 
              rows={2} 
              placeholder="Ghi chú về buổi học, bài tập về nhà, học viên cần chú ý..." 
            />
          </Form.Item>

          <Divider>Điểm danh học viên</Divider>

          {/* Attendance Table */}
          <Table
            dataSource={mockEnrollments.filter(e => e.status === 'active')}
            rowKey="id"
            pagination={false}
            className="mb-4"
            columns={[
              {
                title: 'STT',
                key: 'stt',
                width: 60,
                render: (_: any, __: any, index: number) => index + 1,
              },
              {
                title: 'Học viên',
                dataIndex: 'studentName',
                key: 'studentName',
                width: 250,
              },
              {
                title: 'Trạng thái điểm danh',
                key: 'status',
                render: (_: any, record: any) => (
                  <Form.Item 
                    name={['attendance', record.id]} 
                    noStyle
                    initialValue="present"
                  >
                    <Select
                      style={{ width: 150 }}
                      options={[
                        { 
                          label: '✓ Có mặt', 
                          value: 'present',
                        },
                        { 
                          label: '✗ Vắng', 
                          value: 'absent',
                        },
                        { 
                          label: '⏰ Muộn', 
                          value: 'late',
                        },
                      ]}
                    />
                  </Form.Item>
                ),
              },
              {
                title: 'Ghi chú riêng',
                key: 'note',
                render: (_: any, record: any) => (
                  <Form.Item name={['studentNotes', record.id]} noStyle>
                    <Input placeholder="Ghi chú..." size="small" />
                  </Form.Item>
                ),
              },
            ]}
          />

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                Lưu điểm danh
              </Button>
              <Button onClick={() => setAttendanceModalVisible(false)} size="large">
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
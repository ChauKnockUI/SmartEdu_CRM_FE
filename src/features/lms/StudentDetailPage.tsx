import React, { useState } from 'react';
import { Card, Tabs, Descriptions, Tag, Table, Progress, Button, Space, Alert, Badge, Timeline, Modal, Form, Input, Select, Divider, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  PhoneOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams } from 'react-router';
import { mockStudents, mockPayments } from '../../services/mock/mockData';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';

// Mock schedule data
const mockSchedule = [
  {
    id: 's1',
    date: new Date(2026, 3, 1),
    time: '19:00-21:00',
    class: 'IELTS 6.5 - Lớp A1',
    teacher: 'Nguyễn Văn A',
    room: 'P301',
    status: 'upcoming' as const,
  },
  {
    id: 's2',
    date: new Date(2026, 2, 29),
    time: '19:00-21:00',
    class: 'IELTS 6.5 - Lớp A1',
    teacher: 'Nguyễn Văn A',
    room: 'P301',
    status: 'present' as const,
  },
  {
    id: 's3',
    date: new Date(2026, 2, 27),
    time: '19:00-21:00',
    class: 'IELTS 6.5 - Lớp A1',
    teacher: 'Nguyễn Văn A',
    room: 'P301',
    status: 'present' as const,
  },
  {
    id: 's4',
    date: new Date(2026, 2, 25),
    time: '19:00-21:00',
    class: 'IELTS 6.5 - Lớp A1',
    teacher: 'Nguyễn Văn A',
    room: 'P301',
    status: 'absent' as const,
  },
];

export function StudentDetailPage() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const permissions = usePermissions();
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [transferClassModalVisible, setTransferClassModalVisible] = useState(false);
  const [form] = Form.useForm();

  const student = mockStudents.find(s => s.id === id);

  if (!student) {
    return <div>Học viên không tồn tại</div>;
  }

  // If student role, check if viewing their own profile
  if (role === 'student' && user?.id !== student.id) {
    return (
      <div className="p-8">
        <Alert
          message="Không có quyền truy cập"
          description="Bạn chỉ có thể xem thông tin của chính mình"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const studentPayments = mockPayments.filter(p => p.student_id === id);
  
  // Calculate total debt from unpaid payments
  const totalDebt = studentPayments
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleAddNote = (values: any) => {
    message.success('Đã thêm ghi chú');
    setNoteModalVisible(false);
    form.resetFields();
  };

  const handleAddPayment = (values: any) => {
    message.success('Đã thêm thanh toán');
    setPaymentModalVisible(false);
  };

  const handleTransferClass = (values: any) => {
    message.success('Đã chuyển lớp thành công');
    setTransferClassModalVisible(false);
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
            permissions.canEditStudentProfile && (
              <Button icon={<EditOutlined />}>Chỉnh sửa</Button>
            )
          }
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Tên">{student.full_name}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={student.status === 'active' ? 'green' : 'default'}>
                {student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{student.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{student.email}</Descriptions.Item>
            <Descriptions.Item label="Ngày nhập học">
              {student.enrolledAt.toLocaleDateString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Lớp đang học">
              IELTS 6.5 - Lớp A1
            </Descriptions.Item>
            {permissions.canViewStudentPayments && (
              <Descriptions.Item label="Công nợ">
                <span className={totalDebt > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                  {totalDebt.toLocaleString('vi-VN')} đ
                </span>
              </Descriptions.Item>
            )}
            {role === 'teacher' && (
              <>
                <Descriptions.Item label="Mục tiêu học">IELTS 6.5</Descriptions.Item>
                <Descriptions.Item label="Trình độ hiện tại">Intermediate</Descriptions.Item>
              </>
            )}
          </Descriptions>

          {permissions.canChangeStudentClass && (
            <div className="mt-4">
              <Button icon={<EditOutlined />} onClick={() => setTransferClassModalVisible(true)}>
                Chuyển lớp
              </Button>
            </div>
          )}
        </Card>
      ),
    });

    // Schedule tab - all roles
    tabs.push({
      key: 'schedule',
      label: 'Lịch học',
      children: (
        <Card>
          <Table
            dataSource={mockSchedule}
            rowKey="id"
            columns={[
              {
                title: 'Ngày',
                dataIndex: 'date',
                key: 'date',
                render: (date: Date) => date.toLocaleDateString('vi-VN'),
              },
              {
                title: 'Giờ',
                dataIndex: 'time',
                key: 'time',
              },
              {
                title: 'Lớp học',
                dataIndex: 'class',
                key: 'class',
              },
              ...(role !== 'student' ? [{
                title: 'Giảng viên',
                dataIndex: 'teacher',
                key: 'teacher',
              }] : []),
              {
                title: 'Phòng',
                dataIndex: 'room',
                key: 'room',
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => {
                  if (status === 'upcoming') return <Tag color="blue">Sắp tới</Tag>;
                  if (status === 'present') return <Tag icon={<CheckCircleOutlined />} color="success">Có mặt</Tag>;
                  if (status === 'absent') return <Tag icon={<CloseCircleOutlined />} color="error">Vắng</Tag>;
                  if (status === 'late') return <Tag icon={<ClockCircleOutlined />} color="warning">Muộn</Tag>;
                  return <Tag>{status}</Tag>;
                },
              },
            ]}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    });

    // Attendance tab - all roles
    if (permissions.canViewStudentAttendance) {
      tabs.push({
        key: 'attendance',
        label: 'Điểm danh',
        children: (
          <Card>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Tổng quan điểm danh</h3>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">85%</div>
                    <div className="text-gray-600 mt-1">Tỉ lệ tham gia</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">34</div>
                    <div className="text-gray-600 mt-1">Buổi có mặt</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">6</div>
                    <div className="text-gray-600 mt-1">Buổi vắng</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">2</div>
                    <div className="text-gray-600 mt-1">Buổi muộn</div>
                  </div>
                </Card>
              </div>
            </div>

            {role === 'teacher' && (
              <div className="mb-6">
                <Alert
                  message="Ghi chú giảng viên"
                  description="Học viên có tiến bộ tốt trong 2 tuần gần đây. Tuy nhiên cần chú ý thêm về phần Writing Task 2."
                  type="info"
                  showIcon
                />
              </div>
            )}

            <Divider />

            <h3 className="text-lg font-semibold mb-4">Chi tiết theo buổi</h3>
            <Table
              dataSource={mockSchedule.filter(s => s.status !== 'upcoming')}
              rowKey="id"
              columns={[
                {
                  title: 'Buổi',
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: Date) => date.toLocaleDateString('vi-VN'),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => {
                    if (status === 'present') return <Tag icon={<CheckCircleOutlined />} color="success">Có mặt</Tag>;
                    if (status === 'absent') return <Tag icon={<CloseCircleOutlined />} color="error">Vắng</Tag>;
                    if (status === 'late') return <Tag icon={<ClockCircleOutlined />} color="warning">Muộn</Tag>;
                    return <Tag>{status}</Tag>;
                  },
                },
                {
                  title: 'Ghi chú',
                  dataIndex: 'note',
                  key: 'note',
                  render: (note: string) => note || '-',
                },
              ]}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        ),
      });
    }

    // Payments tab - admin, sale, student
    if (permissions.canViewStudentPayments) {
      tabs.push({
        key: 'payments',
        label: 'Học phí',
        children: (
          <Card
            extra={
              permissions.canEditStudentPayments && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => setPaymentModalVisible(true)}
                >
                  Thêm thanh toán
                </Button>
              )
            }
          >
            {totalDebt > 0 && (
              <Alert
                message="Cảnh báo công nợ"
                description={`Học viên còn nợ ${totalDebt.toLocaleString('vi-VN')} đ. Cần nhắc thanh toán.`}
                type="warning"
                showIcon
                closable
                className="mb-4"
              />
            )}

            {role === 'sale' && (
              <div className="mb-6 bg-blue-50 p-4 rounded">
                <h4 className="font-semibold mb-2">💡 Gợi ý CSKH:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Gọi nhắc học phí vào ngày 25 hàng tháng</li>
                  <li>Đề xuất gia hạn khóa IELTS Advanced (giảm 10%)</li>
                  <li>Liên hệ xác nhận kết quả sau khóa học</li>
                </ul>
              </div>
            )}

            <Table
              dataSource={studentPayments}
              rowKey="id"
              columns={[
                {
                  title: 'Mã',
                  dataIndex: 'id',
                  key: 'id',
                },
                {
                  title: 'Loại',
                  dataIndex: 'type',
                  key: 'type',
                },
                {
                  title: 'Số tiền',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (amount: number) => `${amount.toLocaleString('vi-VN')} đ`,
                },
                {
                  title: 'Hạn thanh toán',
                  dataIndex: 'dueDate',
                  key: 'dueDate',
                  render: (date: Date) => date.toLocaleDateString('vi-VN'),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'paid' ? 'green' : status === 'overdue' ? 'red' : 'orange'}>
                      {status === 'paid' ? 'Đã thanh toán' : status === 'overdue' ? 'Quá hạn' : 'Chưa thanh toán'}
                    </Tag>
                  ),
                },
                ...(permissions.canEditStudentPayments ? [{
                  title: 'Thao tác',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Button type="link" size="small">
                      {record.status === 'paid' ? 'Xem biên lai' : 'Xác nhận thanh toán'}
                    </Button>
                  ),
                }] : []),
              ]}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        ),
      });
    }

    // Notes/Files tab - admin, sale, teacher
    if (['admin', 'sale', 'teacher'].includes(role!)) {
      tabs.push({
        key: 'notes',
        label: 'Ghi chú',
        children: (
          <Card
            extra={
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => setNoteModalVisible(true)}
              >
                Thêm ghi chú
              </Button>
            }
          >
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Ghi chú CSKH</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">Sale 1</span>
                      </div>
                      <p className="text-gray-700">Học viên rất hài lòng với chất lượng giảng dạy. Có nhu cầu gia hạn khóa Advanced.</p>
                      <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleString('vi-VN')}</p>
                    </div>
                  ),
                },
                {
                  color: 'green',
                  children: (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Đánh giá tiến bộ</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">Teacher A</span>
                      </div>
                      <p className="text-gray-700">Học viên tiến bộ tốt. Speaking đã cải thiện từ 5.0 lên 6.0.</p>
                      <p className="text-gray-400 text-sm mt-1">{new Date(2026, 2, 25).toLocaleString('vi-VN')}</p>
                    </div>
                  ),
                },
                {
                  color: 'red',
                  children: (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Cảnh báo</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">System</span>
                      </div>
                      <p className="text-gray-700">Học viên vắng 2 buổi liên tiếp. Cần liên hệ kiểm tra.</p>
                      <p className="text-gray-400 text-sm mt-1">{new Date(2026, 2, 20).toLocaleString('vi-VN')}</p>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ),
      });
    }

    // AI Risk tab - admin, sale, teacher
    if (permissions.canViewStudentRisk) {
      const riskScore = 25; // Mock risk score
      tabs.push({
        key: 'ai-risk',
        label: (
          <Badge dot={riskScore > 50} offset={[5, 0]}>
            <span>Dự đoán AI</span>
          </Badge>
        ),
        children: (
          <Card>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Churn Risk Score</h3>
              <Progress
                percent={riskScore}
                strokeColor={riskScore > 70 ? '#f5222d' : riskScore > 40 ? '#faad14' : '#52c41a'}
                format={(percent) => `${percent}%`}
              />
              <p className="text-gray-600 mt-2">
                {riskScore > 70 && '⚠️ Nguy cơ nghỉ học cao - Cần can thiệp ngay'}
                {riskScore > 40 && riskScore <= 70 && '⚠️ Nguy cơ nghỉ học trung bình - Theo dõi sát'}
                {riskScore <= 40 && '✅ Học viên ổn định'}
              </p>
            </div>

            <Divider />

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Các yếu tố ảnh hưởng:</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Tỉ lệ tham gia lớp</span>
                      <span className="font-medium text-green-600">85% (Tốt)</span>
                    </div>
                    <Progress percent={85} size="small" strokeColor="#52c41a" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Tiến độ học tập</span>
                      <span className="font-medium text-green-600">Tốt</span>
                    </div>
                    <Progress percent={78} size="small" strokeColor="#52c41a" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Thanh toán đúng hạn</span>
                      <span className="font-medium text-orange-600">Chậm 1 lần</span>
                    </div>
                    <Progress percent={60} size="small" strokeColor="#faad14" />
                  </div>
                </div>
              </div>

              {role === 'teacher' && (
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium mb-2">💡 Gợi ý can thiệp:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Nhắc học viên làm bài tập thường xuyên hơn</li>
                    <li>Tăng cường tương tác trong lớp</li>
                    <li>Động viên và tạo động lực học tập</li>
                  </ul>
                </div>
              )}

              {role === 'sale' && (
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium mb-2">💡 Gợi ý CSKH:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Gọi điện hỏi thăm trải nghiệm học tập</li>
                    <li>Nhắc thanh toán học phí đúng hạn</li>
                    <li>Gửi voucher ưu đãi cho khóa tiếp theo</li>
                  </ul>
                </div>
              )}
            </div>
          </Card>
        ),
      });
    }

    return tabs;
  };

  // Build action buttons based on role
  const buildActions = () => {
    const actions: React.ReactNode[] = [];

    if (role === 'sale') {
      actions.push(
        <Button key="call" icon={<PhoneOutlined />} type="primary">
          Gọi điện
        </Button>,
        <Button key="message" icon={<MessageOutlined />}>
          Nhắn tin
        </Button>,
      );
    }

    if (role === 'teacher') {
      actions.push(
        <Button key="progress" icon={<FileTextOutlined />} type="primary">
          Ghi nhận tiến bộ
        </Button>,
      );
    }

    if (permissions.canEditStudentProfile) {
      actions.push(
        <Button key="edit" icon={<EditOutlined />}>
          Chỉnh sửa hồ sơ
        </Button>,
      );
    }

    return <Space>{actions}</Space>;
  };

  return (
    <div>
      <PageHeader
        title={student.full_name}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Học viên', href: '/lms/students' },
          { title: student.full_name },
        ]}
        actions={buildActions()}
      />

      <Tabs defaultActiveKey="overview" items={buildTabItems()} />

      {/* Add Note Modal */}
      <Modal
        title="Thêm ghi chú"
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddNote}>
          <Form.Item
            name="type"
            label="Loại ghi chú"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'CSKH', value: 'cskh' },
                { label: 'Đánh giá tiến bộ', value: 'progress' },
                { label: 'Cảnh báo', value: 'warning' },
                { label: 'Khác', value: 'other' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập nội dung ghi chú..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
              <Button onClick={() => setNoteModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        title="Thêm thanh toán"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAddPayment}>
          <Form.Item name="type" label="Loại thanh toán" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Học phí khóa học', value: 'tuition' },
                { label: 'Học phí tháng', value: 'monthly' },
                { label: 'Tài liệu', value: 'materials' },
                { label: 'Khác', value: 'other' },
              ]}
            />
          </Form.Item>

          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <Input suffix="đ" placeholder="5000000" />
          </Form.Item>

          <Form.Item name="method" label="Phương thức">
            <Select
              options={[
                { label: 'Tiền mặt', value: 'cash' },
                { label: 'Chuyển khoản', value: 'transfer' },
                { label: 'Thẻ', value: 'card' },
              ]}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Xác nhận
              </Button>
              <Button onClick={() => setPaymentModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer Class Modal */}
      <Modal
        title="Chuyển lớp học"
        open={transferClassModalVisible}
        onCancel={() => setTransferClassModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleTransferClass}>
          <Form.Item name="fromClass" label="Lớp hiện tại">
            <Input disabled value="IELTS 6.5 - Lớp A1" />
          </Form.Item>

          <Form.Item name="toClass" label="Chuyển sang lớp" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn lớp mới"
              options={[
                { label: 'IELTS 6.5 - Lớp A2', value: 'a2' },
                { label: 'IELTS 7.0 - Lớp B1', value: 'b1' },
                { label: 'IELTS Speaking - Lớp C1', value: 'c1' },
              ]}
            />
          </Form.Item>

          <Form.Item name="reason" label="Lý do chuyển lớp" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Nhập lý do..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Xác nhận chuyển lớp
              </Button>
              <Button onClick={() => setTransferClassModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

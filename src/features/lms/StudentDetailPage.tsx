import { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  EditOutlined,
  KeyOutlined,
  CopyOutlined,
  TeamOutlined,
  CalendarOutlined,
  MailOutlined,
  PhoneOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { studentService } from '@/services/api/student.service';
import { financeService } from '@/services/api/finance.service';

type Student = any;

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  graduated: 'blue',
  dropped: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang học',
  inactive: 'Tạm ngưng',
  graduated: 'Đã tốt nghiệp',
  dropped: 'Nghỉ học',
};

const DAY_MAP: Record<string, string> = {
  Sun: 'CN',
  Mon: 'Thứ 2',
  Tue: 'Thứ 3',
  Wed: 'Thứ 4',
  Thu: 'Thứ 5',
  Fri: 'Thứ 6',
  Sat: 'Thứ 7',
};

const formatSchedule = (days?: string, time?: string) => {
  if (!days) return 'Chưa có lịch';

  const formattedDays = days
    .split(',')
    .map((d) => DAY_MAP[d.trim()] || d)
    .join(', ');

  return `${formattedDays} (${time || ''})`;
};

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const RISK_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [form] = Form.useForm();

  const fetchStudent = async () => {
    try {
      setLoading(true);

      const res = await studentService.getById(Number(id));
      const invoiceRes = await financeService.getStudentInvoices(Number(id));
      const data = res.data;

      setStudent(data);
      setInvoices(invoiceRes.data || []);

      form.setFieldsValue({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        status: data.status,
      });
    } catch (err) {
      console.error(err);
      message.error('Không tải được học viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      await studentService.update(Number(id), values);

      message.success('Cập nhật học viên thành công');
      setEditOpen(false);
      fetchStudent();
    } catch (err: any) {
      message.error(err.message || 'Cập nhật thất bại');
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await studentService.resetPassword(Number(id));
      setNewPassword(res.new_password);
      setPasswordOpen(true);
    } catch (err: any) {
      message.error(err.message || 'Reset mật khẩu thất bại');
    }
  };

  const handleScoreDropoutRisk = async () => {
    try {
      const activeEnrollment = (student?.classEnrollments || []).find((item: any) => item.status === 'active') || student?.classEnrollments?.[0];
      const classId = activeEnrollment?.class_id || activeEnrollment?.class?.id;

      if (!classId) {
        message.warning('Học viên chưa có lớp để tính dropout risk');
        return;
      }

      await studentService.scoreDropoutRisk(Number(id), Number(classId));
      message.success('Đã cập nhật dropout risk');
      fetchStudent();
    } catch (err: any) {
      message.error(err.message || 'Không tính được dropout risk');
    }
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(newPassword);
    message.success('Đã copy mật khẩu');
  };

  if (!student) {
    return <div>Không tìm thấy học viên</div>;
  }

  const enrolledClasses = student.classEnrollments || [];

  const classColumns = [
    {
      title: 'Lớp học',
      render: (_: any, record: any) => (
        <span className="font-medium">{record.class?.name}</span>
      ),
    },
    {
      title: 'Khóa học',
      render: (_: any, record: any) => record.class?.course?.name || '-',
    },
    {
      title: 'Giảng viên',
      render: (_: any, record: any) =>
        record.class?.teacher?.full_name || 'Chưa phân công',
    },
    {
      title: 'Phòng',
      render: (_: any, record: any) =>
        record.class?.room?.name || 'Chưa xếp phòng',
    },
    {
      title: 'Lịch học',
      render: (_: any, record: any) =>
        formatSchedule(
          record.class?.schedule_days,
          record.class?.schedule_time
        ),
    },
    {
      title: 'Trạng thái',
      render: (_: any, record: any) => (
        <Tag color={STATUS_COLORS[record.class?.status] || 'default'}>
          {STATUS_LABELS[record.class?.status] || record.class?.status}
        </Tag>
      ),
    },
  ];

  const scheduleColumns = [
    {
      title: 'Lớp học',
      render: (_: any, record: any) => record.class?.name,
    },
    {
      title: 'Lịch',
      render: (_: any, record: any) =>
        formatSchedule(
          record.class?.schedule_days,
          record.class?.schedule_time
        ),
    },
    {
      title: 'Thời gian khóa',
      render: (_: any, record: any) => (
        <>
          {record.class?.start_date
            ? new Date(record.class.start_date).toLocaleDateString('vi-VN')
            : '-'}
          {' → '}
          {record.class?.end_date
            ? new Date(record.class.end_date).toLocaleDateString('vi-VN')
            : '-'}
        </>
      ),
    },
  ];

  const invoiceColumns = [
    { title: 'Invoice', dataIndex: 'invoice_no' },
    { title: 'Phải thu', dataIndex: 'total_amount', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', render: money },
    { title: 'Còn nợ', dataIndex: 'remaining_amount', render: money },
    {
      title: 'Hạn thu',
      dataIndex: 'due_date',
      render: (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => <Tag color={status === 'paid' ? 'green' : status === 'partial' ? 'blue' : 'orange'}>{status}</Tag>,
    },
  ];

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
        actions={<Space>
          <Button
            icon={<KeyOutlined />}
            onClick={handleResetPassword}
          >
            Cấp lại mật khẩu
          </Button>

          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setEditOpen(true)}
          >
            Chỉnh sửa
          </Button>
        </Space>}
      />

      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <>
                <Row gutter={16} className="mb-4">
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Số lớp đang học"
                        value={enrolledClasses.length}
                        prefix={<TeamOutlined />}
                      />
                    </Card>
                  </Col>

                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Trạng thái"
                        value={STATUS_LABELS[student.status]}
                      />
                    </Card>
                  </Col>

                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Nguồn"
                        value={student.lead ? 'Từ Lead' : 'Đăng ký trực tiếp'}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card className="mb-4" loading={loading}>
                  <Row gutter={16} align="middle">
                    <Col span={6}>
                      <Statistic
                        title="Dropout risk"
                        value={student.dropout_risk ?? 0}
                        suffix="%"
                        precision={1}
                        prefix={<WarningOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Tag color={RISK_COLORS[student.dropout_risk_level] || 'default'}>
                        {student.dropout_risk_level ? RISK_LABELS[student.dropout_risk_level] || student.dropout_risk_level : 'Chưa tính'}
                      </Tag>
                    </Col>
                    <Col span={8}>
                      <Space direction="vertical" size={4}>
                        {(student.dropout_risk_reasons || []).slice(0, 3).map((reason: string, index: number) => (
                          <Typography.Text key={`${reason}-${index}`}>{reason}</Typography.Text>
                        ))}
                        {student.dropout_risk_updated_at && (
                          <Typography.Text type="secondary">
                            Cập nhật: {new Date(student.dropout_risk_updated_at).toLocaleString('vi-VN')}
                          </Typography.Text>
                        )}
                      </Space>
                    </Col>
                    <Col span={4}>
                      <Button onClick={handleScoreDropoutRisk}>
                        Tính lại risk
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Card loading={loading}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Họ tên">
                      {student.full_name}
                    </Descriptions.Item>

                    <Descriptions.Item label="Trạng thái">
                      <Tag color={STATUS_COLORS[student.status]}>
                        {STATUS_LABELS[student.status]}
                      </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Email">
                      <Space>
                        <MailOutlined />
                        {student.email}
                      </Space>
                    </Descriptions.Item>

                    <Descriptions.Item label="Số điện thoại">
                      <Space>
                        <PhoneOutlined />
                        {student.phone || '-'}
                      </Space>
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày sinh">
                      {student.dob
                        ? new Date(student.dob).toLocaleDateString('vi-VN')
                        : '-'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Tài khoản user">
                      {student.user?.email || '-'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Nguồn lead">
                      {student.lead?.full_name || 'Không có'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Lead email">
                      {student.lead?.email || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </>
            ),
          },

          {
            key: 'classes',
            label: 'Lớp đang học',
            children: (
              <Card title={`Danh sách lớp (${enrolledClasses.length})`}>
                <Table
                  rowKey="id"
                  dataSource={enrolledClasses}
                  columns={classColumns}
                  pagination={false}
                />
              </Card>
            ),
          },

          {
            key: 'schedule',
            label: 'Lịch học',
            children: (
              <Card title="Lịch học hiện tại">
                <Table
                  rowKey="id"
                  dataSource={enrolledClasses}
                  columns={scheduleColumns}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'finance',
            label: 'Học phí',
            children: (
              <Card title="Khoản phải thu và công nợ">
                <Table
                  rowKey="id"
                  dataSource={invoices}
                  columns={invoiceColumns}
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* EDIT */}
      <Modal
        title="Chỉnh sửa học viên"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleUpdate}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="full_name"
            label="Họ tên"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true },
              { type: 'email' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
          >
            <Select
              options={[
                { label: 'Đang học', value: 'active' },
                { label: 'Tạm ngưng', value: 'inactive' },
                { label: 'Đã tốt nghiệp', value: 'graduated' },
                { label: 'Nghỉ học', value: 'dropped' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* RESET PASSWORD */}
      <Modal
        title="Mật khẩu mới"
        open={passwordOpen}
        onCancel={() => setPasswordOpen(false)}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyPassword}
          >
            Copy
          </Button>,
          <Button
            key="close"
            onClick={() => setPasswordOpen(false)}
          >
            Đóng
          </Button>,
        ]}
      >
        <Typography.Text>
          Backend chỉ trả mật khẩu này đúng 1 lần.
        </Typography.Text>

        <div className="mt-4 p-4 bg-gray-100 rounded text-center">
          <Typography.Title level={3}>
            {newPassword}
          </Typography.Title>
        </div>
      </Modal>
    </div>
  );
}

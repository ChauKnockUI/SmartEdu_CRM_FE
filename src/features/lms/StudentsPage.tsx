import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  message,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  SearchOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { studentService } from '@/services/api/student.service';

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

export function StudentsPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [hasDebt, setHasDebt] = useState<boolean | undefined>();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>('');

  const [form] = Form.useForm();

  // ================= FETCH =================
  const fetchStudents = async () => {
    try {
      setLoading(true);

      const res = await studentService.getAll({
        page,
        limit,
        search: search || undefined,
        status,
        has_debt: hasDebt,
      });

      setStudents(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error(err);
      message.error('Lỗi tải danh sách học viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, limit, search, status, hasDebt]);

  // ================= CREATE =================
  const handleCreateStudent = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        ...values,
        dob: values.dob
          ? values.dob.format('YYYY-MM-DD')
          : undefined,
        lead_id: values.lead_id
          ? Number(values.lead_id)
          : undefined,
      };

      const res = await studentService.create(payload);

      setCreateModalOpen(false);
      form.resetFields();

      setTempPassword(res.temp_password || '');
      setPasswordModalOpen(true);

      message.success('Tạo học viên thành công');
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Tạo học viên thất bại');
    }
  };

  // ================= COPY PASSWORD =================
  const copyPassword = async () => {
    if (!tempPassword) return;

    await navigator.clipboard.writeText(tempPassword);
    message.success('Đã copy mật khẩu');
  };

  // ================= TABLE =================
  const columns: ColumnsType<Student> = [
    {
      title: 'Tên học viên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (_, record) => (
        <a
          onClick={() => navigate(`/lms/students/${record.id}`)}
          className="font-medium"
        >
          {record.full_name}
        </a>
      ),
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Số lớp',
      key: 'classes',
      render: (_, record) =>
        record.classEnrollments?.length || 0,
    },
    {
      title: 'Công nợ',
      key: 'debt',
      render: (_, record) => {
        const hasPendingDebt =
          record.payments?.some((p: any) => p.status === 'pending');

        return (
          <Tag color={hasPendingDebt ? 'red' : 'green'}>
            {hasPendingDebt ? 'Đang nợ' : 'Đã đóng đủ'}
          </Tag>
        );
      },
    },
    {
      title: 'Dropout risk',
      key: 'dropout_risk',
      sorter: (a, b) => Number(a.dropout_risk || 0) - Number(b.dropout_risk || 0),
      render: (_, record) => {
        const score = record.dropout_risk;
        const level = record.dropout_risk_level;

        if (score === null || score === undefined) {
          return <Tag>Chưa tính</Tag>;
        }

        return (
          <Tag color={RISK_COLORS[level] || 'default'}>
            {RISK_LABELS[level] || level} - {Number(score).toFixed(1)}%
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/lms/students/${record.id}`)}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý Học viên"
        actions={
          <>
            <Button icon={<ExportOutlined />}>
              Export
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Thêm học viên
            </Button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        {/* FILTER */}
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Tìm tên / email / SĐT"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />

          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 180 }}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            options={[
              { label: 'Đang học', value: 'active' },
              { label: 'Tạm ngưng', value: 'inactive' },
              { label: 'Đã tốt nghiệp', value: 'graduated' },
              { label: 'Nghỉ học', value: 'dropped' },
            ]}
          />

          <Select
            placeholder="Công nợ"
            allowClear
            style={{ width: 180 }}
            value={hasDebt}
            onChange={(value) => {
              setPage(1);
              setHasDebt(value);
            }}
            options={[
              { label: 'Đang nợ', value: true },
              { label: 'Đã đóng đủ', value: false },
            ]}
          />
        </div>

        {/* TABLE */}
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
            showTotal: (t) => `Tổng ${t} học viên`,
          }}
        />
      </div>

      {/* CREATE STUDENT */}
      <Modal
        title="Tạo học viên mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateStudent}
        okText="Tạo"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="full_name"
            label="Họ tên"
            rules={[{ required: true, message: 'Nhập họ tên' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
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
            name="dob"
            label="Ngày sinh"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="lead_id"
            label="Lead ID (nếu chuyển từ Lead)"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* TEMP PASSWORD */}
      <Modal
        title="Tạo tài khoản thành công"
        open={passwordModalOpen}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyPassword}
          >
            Copy mật khẩu
          </Button>,
          <Button
            key="close"
            onClick={() => setPasswordModalOpen(false)}
          >
            Đóng
          </Button>,
        ]}
        onCancel={() => setPasswordModalOpen(false)}
      >
        <Typography.Text>
          Backend chỉ trả mật khẩu này đúng 1 lần. Hãy copy lại.
        </Typography.Text>

        <div className="mt-4 p-4 bg-gray-100 rounded text-center">
          <Typography.Title level={3}>
            {tempPassword}
          </Typography.Title>
        </div>
      </Modal>
    </div>
  );
}

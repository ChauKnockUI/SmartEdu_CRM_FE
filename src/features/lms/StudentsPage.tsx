import { Table, Tag, Button, Space } from 'antd';
import { PlusOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockStudents } from '../../services/mock/mockData';
import type { Student } from '../../shared/types';
import { useNavigate } from 'react-router';

// Constants
const STATUS_COLORS = {
  active: 'green',
  inactive: 'default',
  graduated: 'blue',
} as const;

const STATUS_LABELS = {
  active: 'Đang học',
  inactive: 'Nghỉ học',
  graduated: 'Đã tốt nghiệp',
} as const;

// Table columns configuration
const getColumns = (navigate: (path: string) => void): ColumnsType<Student> => [
  {
    title: 'Tên học viên',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    render: (name, record) => (
      <a onClick={() => navigate(`/lms/students/${record.id}`)} className="font-medium">
        {name}
      </a>
    ),
  },
  {
    title: 'Điện thoại',
    dataIndex: 'phone',
    key: 'phone',
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
    filters: [
      { text: 'Đang học', value: 'active' },
      { text: 'Nghỉ học', value: 'inactive' },
      { text: 'Đã tốt nghiệp', value: 'graduated' },
    ],
    onFilter: (value, record) => record.status === value,
    render: (status: Student['status']) => (
      <Tag color={STATUS_COLORS[status]}>
        {STATUS_LABELS[status]}
      </Tag>
    ),
  },
  {
    title: 'Ngày nhập học',
    dataIndex: 'enrolledAt',
    key: 'enrolledAt',
    sorter: (a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime(),
    render: (date: Date) => date.toLocaleDateString('vi-VN'),
  },
  {
    title: 'Công nợ',
    dataIndex: 'totalDebt',
    key: 'totalDebt',
    sorter: (a, b) => a.totalDebt - b.totalDebt,
    render: (debt: number) => (
      <span className={debt > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
        {debt.toLocaleString('vi-VN')} đ
      </span>
    ),
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

export function StudentsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Quản lý Học viên"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Học viên' },
        ]}
        actions={
          <>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Thêm học viên
            </Button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Table
          columns={getColumns(navigate)}
          dataSource={mockStudents}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} học viên`,
          }}
        />
      </div>
    </div>
  );
}
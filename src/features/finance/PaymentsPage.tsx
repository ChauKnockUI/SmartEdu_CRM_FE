import { Table, Tag, Button, Space } from 'antd';
import { PlusOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockPayments } from '../../services/mock/mockData';
import type { Payment } from '../../shared/types';

// Constants
const STATUS_COLORS = {
  pending: 'orange',
  paid: 'green',
  overdue: 'red',
} as const;

const STATUS_LABELS = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  overdue: 'Quá hạn',
} as const;

const TYPE_LABELS = {
  tuition: 'Học phí',
  registration: 'Lệ phí đăng ký',
  material: 'Tài liệu',
} as const;

// Table columns configuration
const getColumns = (): ColumnsType<Payment> => [
  {
    title: 'Mã',
    dataIndex: 'id',
    key: 'id',
    width: 120,
  },
  {
    title: 'Học viên',
    dataIndex: 'studentName',
    key: 'studentName',
    sorter: (a, b) => a.studentName.localeCompare(b.studentName),
  },
  {
    title: 'Loại',
    dataIndex: 'type',
    key: 'type',
    filters: [
      { text: 'Học phí', value: 'tuition' },
      { text: 'Lệ phí đăng ký', value: 'registration' },
      { text: 'Tài liệu', value: 'material' },
    ],
    onFilter: (value, record) => record.type === value,
    render: (type: Payment['type']) => TYPE_LABELS[type],
  },
  {
    title: 'Số tiền',
    dataIndex: 'amount',
    key: 'amount',
    sorter: (a, b) => a.amount - b.amount,
    render: (amount: number) => (
      <span className="font-semibold">
        {amount.toLocaleString('vi-VN')} đ
      </span>
    ),
  },
  {
    title: 'Hạn thanh toán',
    dataIndex: 'dueDate',
    key: 'dueDate',
    sorter: (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
    render: (date: Date) => date.toLocaleDateString('vi-VN'),
  },
  {
    title: 'Ngày thanh toán',
    dataIndex: 'paidDate',
    key: 'paidDate',
    render: (date?: Date) => (date ? date.toLocaleDateString('vi-VN') : '-'),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    filters: [
      { text: 'Chưa thanh toán', value: 'pending' },
      { text: 'Đã thanh toán', value: 'paid' },
      { text: 'Quá hạn', value: 'overdue' },
    ],
    onFilter: (value, record) => record.status === value,
    render: (status: Payment['status']) => (
      <Tag color={STATUS_COLORS[status]}>
        {STATUS_LABELS[status]}
      </Tag>
    ),
  },
  {
    title: 'Hành động',
    key: 'actions',
    render: (_, record) => (
      <Space size="small">
        {record.status !== 'paid' && (
          <Button type="link" size="small">
            Thu tiền
          </Button>
        )}
        <Button type="link" size="small">
          Chi tiết
        </Button>
      </Space>
    ),
  },
];

// Table summary component
const getSummary = (pageData: readonly Payment[]) => {
  const totals = pageData.reduce(
    (acc, { amount, status }) => {
      acc.total += amount;
      if (status === 'paid') acc.paid += amount;
      if (status === 'overdue') acc.overdue += amount;
      return acc;
    },
    { total: 0, paid: 0, overdue: 0 }
  );

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={3}>
          <strong>Tổng cộng</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1}>
          <strong>{totals.total.toLocaleString('vi-VN')} đ</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} colSpan={2}>
          <span className="text-green-600">
            Đã thu: {totals.paid.toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3}>
          <span className="text-red-600">
            Quá hạn: {totals.overdue.toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} />
      </Table.Summary.Row>
    </Table.Summary>
  );
};

export function PaymentsPage() {

// Table summary component
const getSummary = (pageData: readonly Payment[]) => {
  const totals = pageData.reduce(
    (acc, { amount, status }) => {
      acc.total += amount;
      if (status === 'paid') acc.paid += amount;
      if (status === 'overdue') acc.overdue += amount;
      return acc;
    },
    { total: 0, paid: 0, overdue: 0 }
  );

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={3}>
          <strong>Tổng cộng</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1}>
          <strong>{totals.total.toLocaleString('vi-VN')} đ</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} colSpan={2}>
          <span className="text-green-600">
            Đã thu: {totals.paid.toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3}>
          <span className="text-red-600">
            Quá hạn: {totals.overdue.toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} />
      </Table.Summary.Row>
    </Table.Summary>
  );
};

  return (
    <div>
      <PageHeader
        title="Quản lý Học phí"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Tài chính' },
          { title: 'Học phí' },
        ]}
        actions={
          <>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Tạo phiếu thu
            </Button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Table
          columns={getColumns()}
          dataSource={mockPayments}
          rowKey="id"
          summary={getSummary}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} phiếu thu`,
          }}
        />
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  vnpay: 'VNPay',
  other: 'Khác',
};

export function PaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [form] = Form.useForm();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await financeService.getInvoices({ limit: 100 });
      setInvoices(res.data || []);
    } catch (err: any) {
      message.error(err.message || 'Không tải được dữ liệu thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const transactions = invoices.flatMap((invoice) =>
    (invoice.payments || []).map((payment: any) => ({
      ...payment,
      invoice_no: invoice.invoice_no,
      student_name: invoice.student?.full_name,
      class_name: invoice.class?.name,
    }))
  );

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    form.resetFields();
    form.setFieldsValue({
      amount: invoice.remaining_amount,
      method: 'bank_transfer',
    });
    setPaymentOpen(true);
  };

  const submitPayment = async () => {
    try {
      const values = await form.validateFields();
      await financeService.recordPayment(selectedInvoice.id, values);
      message.success('Đã ghi nhận thanh toán');
      setPaymentOpen(false);
      loadInvoices();
    } catch (err: any) {
      message.error(err.message || 'Ghi nhận thanh toán thất bại');
    }
  };

  const columns: ColumnsType<any> = [
    { title: 'Biên nhận', dataIndex: 'id', width: 100, render: (id) => `#${id}` },
    { title: 'Invoice', dataIndex: 'invoice_no', width: 160 },
    { title: 'Học viên', dataIndex: 'student_name' },
    { title: 'Lớp', dataIndex: 'class_name', render: (value) => value || '-' },
    { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: money },
    {
      title: 'Phương thức',
      dataIndex: 'method',
      render: (value) => <Tag>{METHOD_LABELS[value] || value}</Tag>,
    },
    {
      title: 'Ngày thu',
      dataIndex: 'paid_at',
      render: (value) => value ? new Date(value).toLocaleString('vi-VN') : '-',
    },
    { title: 'Mã giao dịch', dataIndex: 'reference_code', render: (value) => value || '-' },
  ];

  const invoiceColumns: ColumnsType<any> = [
    { title: 'Invoice', dataIndex: 'invoice_no', width: 160 },
    { title: 'Học viên', render: (_, record) => record.student?.full_name },
    { title: 'Lớp', render: (_, record) => record.class?.name || '-' },
    { title: 'Phải thu', dataIndex: 'total_amount', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', align: 'right', render: money },
    { title: 'Còn nợ', dataIndex: 'remaining_amount', align: 'right', render: money },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <Tag color={status === 'paid' ? 'green' : status === 'partial' ? 'blue' : 'orange'}>{status}</Tag>,
    },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Button type="link" disabled={record.remaining_amount <= 0} onClick={() => openPaymentModal(record)}>
          Thu tiền
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Giao dịch thanh toán"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Tài chính' },
          { title: 'Thanh toán' },
        ]}
        actions={<Button icon={<ReloadOutlined />} onClick={loadInvoices}>Tải lại</Button>}
      />

      <Space direction="vertical" size={16} className="w-full">
        <Card title="Giao dịch đã thu">
          <Table
            loading={loading}
            columns={columns}
            dataSource={transactions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        <Card title="Khoản phải thu cần xử lý">
          <Table
            loading={loading}
            columns={invoiceColumns}
            dataSource={invoices.filter((invoice) => invoice.remaining_amount > 0)}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>

      <Modal
        title={`Thu tiền ${selectedInvoice?.invoice_no || ''}`}
        open={paymentOpen}
        onCancel={() => setPaymentOpen(false)}
        onOk={submitPayment}
        okText="Ghi nhận"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="method" label="Phương thức" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Chuyển khoản', value: 'bank_transfer' },
                { label: 'Tiền mặt', value: 'cash' },
                { label: 'MoMo', value: 'momo' },
                { label: 'VNPay', value: 'vnpay' },
                { label: 'Khác', value: 'other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reference_code" label="Mã giao dịch">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

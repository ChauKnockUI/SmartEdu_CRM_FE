import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export function InvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form] = Form.useForm();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await financeService.getInvoices({ limit: 100 });
      setInvoices(res.data || []);
    } catch (err: any) {
      message.error(err.message || 'Không tải được danh sách khoản phải thu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const submitCreate = async () => {
    try {
      const values = await form.validateFields();
      await financeService.createInvoice({
        student_id: values.student_id,
        class_id: values.class_id,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        discount_amount: values.discount_amount || 0,
        notes: values.notes,
        items: [{
          type: values.item_type,
          description: values.description,
          amount: values.amount,
        }],
      });
      message.success('Đã tạo khoản phải thu');
      setCreateOpen(false);
      form.resetFields();
      loadInvoices();
    } catch (err: any) {
      message.error(err.message || 'Tạo khoản phải thu thất bại');
    }
  };

  const columns: ColumnsType<any> = [
    { title: 'Mã invoice', dataIndex: 'invoice_no', width: 160 },
    { title: 'Học viên', render: (_, record) => record.student?.full_name },
    { title: 'Lớp', render: (_, record) => record.class?.name || '-' },
    { title: 'Tổng phí', dataIndex: 'total_amount', align: 'right', render: money },
    { title: 'Giảm giá', dataIndex: 'discount_amount', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', align: 'right', render: money },
    { title: 'Còn nợ', dataIndex: 'remaining_amount', align: 'right', render: money },
    {
      title: 'Hạn thu',
      dataIndex: 'due_date',
      render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <Tag color={status === 'paid' ? 'green' : status === 'partial' ? 'blue' : 'orange'}>{status}</Tag>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Khoản phải thu"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Tài chính' },
          { title: 'Invoices' },
        ]}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadInvoices}>Tải lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo invoice</Button>
          </Space>
        }
      />

      <Card>
        <Table loading={loading} rowKey="id" columns={columns} dataSource={invoices} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title="Tạo khoản phải thu"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        okText="Tạo"
      >
        <Form form={form} layout="vertical" initialValues={{ item_type: 'tuition', discount_amount: 0 }}>
          <Form.Item name="student_id" label="ID học viên" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="class_id" label="ID lớp">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="item_type" label="Loại phí" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Học phí', value: 'tuition' },
                { label: 'Lệ phí đăng ký', value: 'registration' },
                { label: 'Tài liệu', value: 'material' },
                { label: 'Thi thử', value: 'exam' },
                { label: 'Khác', value: 'other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="discount_amount" label="Giảm giá">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="due_date" label="Hạn thu">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, message, Alert, Typography } from 'antd';
import { ClockCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';
import { classService } from '../../services/api/class.service';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const daysUntil = (date?: string) => {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const invoiceStatus = (invoice: any) => {
  const remaining = Number(invoice.remaining_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  if (remaining <= 0 || invoice.status === 'paid') return 'paid';
  const diff = daysUntil(invoice.due_date);
  if (diff !== null && diff < 0) return 'overdue';
  if (paid > 0 || invoice.status === 'partial') return 'partial';
  return 'pending';
};

const statusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chưa thu', color: 'orange' },
  partial: { label: 'Thu một phần', color: 'blue' },
  paid: { label: 'Đã thu đủ', color: 'green' },
  overdue: { label: 'Quá hạn', color: 'red' },
};

export function InvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [template, setTemplate] = useState<any | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
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

  const loadClasses = async () => {
    const res = await classService.getAll({ limit: 100 });
    setClasses(res.data || []);
  };

  useEffect(() => {
    loadInvoices();
    loadClasses().catch(() => undefined);
  }, []);

  const handleClassChange = async (classId: number) => {
    form.setFieldsValue({ student_ids: [] });
    setSelectedStudentIds([]);
    setTemplate(null);
    try {
      const res = await financeService.getClassFeeTemplate(classId);
      setTemplate(res.data);
    } catch (err: any) {
      message.error(err.message || 'Không tải được cấu hình phí của lớp');
    }
  };

  const templateTotal = useMemo(
    () => (template?.items || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
    [template]
  );

  const rows = useMemo(() => invoices
    .map((invoice) => ({ ...invoice, view_status: invoiceStatus(invoice) }))
    .filter((invoice) => {
      if (statusFilter === 'active') return invoice.view_status !== 'paid';
      if (statusFilter === 'all') return true;
      return invoice.view_status === statusFilter;
    })
    .filter((invoice) => {
      const haystack = [
        invoice.invoice_no,
        invoice.student?.full_name,
        invoice.student?.email,
        invoice.student?.phone,
        invoice.class?.name,
      ].join(' ').toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => {
      const rank = { overdue: 0, partial: 1, pending: 2, paid: 3 } as Record<string, number>;
      const priority = rank[a.view_status] - rank[b.view_status];
      if (priority !== 0) return priority;
      return new Date(a.due_date || '2999-01-01').getTime() - new Date(b.due_date || '2999-01-01').getTime();
    }), [invoices, query, statusFilter]);

  const summary = useMemo(() => {
    const active = invoices.filter((item) => invoiceStatus(item) !== 'paid');
    return {
      activeAmount: active.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0),
      overdueAmount: active.filter((item) => invoiceStatus(item) === 'overdue').reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0),
      partialCount: active.filter((item) => invoiceStatus(item) === 'partial').length,
      paidCount: invoices.filter((item) => invoiceStatus(item) === 'paid').length,
    };
  }, [invoices]);

  const submitCreate = async () => {
    try {
      const values = await form.validateFields();
      const studentIds = Array.isArray(values.student_ids)
        ? values.student_ids
        : values.student_ids
          ? [values.student_ids]
          : undefined;
      const payload = {
        class_id: values.class_id,
        student_ids: values.mode === 'selected' ? studentIds : undefined,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        discount_amount: values.discount_amount || 0,
        notes: values.notes,
        extra_items: values.extra_item_enabled
          ? [{
              type: values.extra_item_type,
              description: values.extra_item_description,
              amount: values.extra_item_amount,
            }]
          : [],
      };

      const res = values.mode === 'single'
        ? await financeService.createInvoiceFromClass({
            class_id: values.class_id,
            student_id: studentIds?.[0],
            due_date: payload.due_date,
            discount_amount: payload.discount_amount,
            notes: payload.notes,
            extra_items: payload.extra_items,
          })
        : await financeService.createInvoicesForClass(payload);

      const skipped = res.data?.skipped?.length || 0;
      message.success(skipped ? `Đã tạo invoice, bỏ qua ${skipped} học viên đã có invoice` : 'Đã tạo invoice');
      setCreateOpen(false);
      form.resetFields();
      setTemplate(null);
      setSelectedStudentIds([]);
      loadInvoices();
    } catch (err: any) {
      message.error(err.message || 'Tạo khoản phải thu thất bại');
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Ưu tiên',
      width: 120,
      render: (_, record) => {
        if (record.view_status === 'overdue') return <Tag color="red" icon={<WarningOutlined />}>Quá hạn</Tag>;
        if (record.view_status === 'partial') return <Tag color="blue" icon={<ClockCircleOutlined />}>Còn thiếu</Tag>;
        if (record.view_status === 'paid') return <Tag color="green">Đã thu</Tag>;
        return <Tag color="orange">Chưa thu</Tag>;
      },
    },
    {
      title: 'Học viên',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.student?.full_name}</Typography.Text>
          <Typography.Text type="secondary">{record.student?.phone || record.student?.email || '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Lớp / Invoice',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.class?.name || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.invoice_no}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Phải thu', dataIndex: 'total_amount', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', align: 'right', render: money },
    { title: 'Còn lại', dataIndex: 'remaining_amount', align: 'right', render: (value) => <Typography.Text strong>{money(value)}</Typography.Text> },
    { title: 'Hạn thu', dataIndex: 'due_date', render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-' },
    { title: 'Trạng thái', render: (_, record) => <Tag color={statusMeta[record.view_status].color}>{statusMeta[record.view_status].label}</Tag> },
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo invoice theo lớp</Button>
          </Space>
        }
      />

      <Card>
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title="Đang phải thu" value={summary.activeAmount} formatter={(value) => money(Number(value))} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title="Quá hạn" value={summary.overdueAmount} valueStyle={{ color: '#cf1322' }} formatter={(value) => money(Number(value))} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title="Thu một phần" value={summary.partialCount} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title="Đã thu đủ" value={summary.paidCount} /></Card>
          </Col>
        </Row>

        <Space className="mb-4 w-full" size={12} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm học viên, SĐT, email, lớp, invoice"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ width: 360 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 200 }}
            options={[
              { label: 'Đang phải thu', value: 'active' },
              { label: 'Quá hạn', value: 'overdue' },
              { label: 'Thu một phần', value: 'partial' },
              { label: 'Chưa thu', value: 'pending' },
              { label: 'Đã thu đủ', value: 'paid' },
              { label: 'Tất cả', value: 'all' },
            ]}
          />
        </Space>

        <Table
          loading={loading}
          rowKey="id"
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1120 }}
          pagination={{ pageSize: 12, showTotal: (total) => `${total} khoản phải thu` }}
        />
      </Card>

      <Modal
        title="Tạo khoản phải thu theo lớp"
        open={createOpen}
        width={760}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        okText="Tạo invoice"
      >
        <Form form={form} layout="vertical" initialValues={{ mode: 'all', discount_amount: 0, extra_item_type: 'material' }}>
          <Form.Item name="class_id" label="Lớp" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn lớp"
              optionFilterProp="label"
              onChange={handleClassChange}
              options={classes.map((item) => ({
                label: `${item.name}${item.course?.name ? ` - ${item.course.name}` : ''}`,
                value: item.id,
              }))}
            />
          </Form.Item>

          {template && (
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message={`Mẫu phí: ${money(templateTotal)} cho ${template.students?.length || 0} học viên đang active`}
              description={
                <Space direction="vertical" size={2}>
                  {(template.items || []).map((item: any, index: number) => (
                    <Typography.Text key={index}>{item.description}: {money(item.amount)}</Typography.Text>
                  ))}
                </Space>
              }
            />
          )}

          <Form.Item name="mode" label="Phạm vi tạo invoice" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Tất cả học viên active trong lớp', value: 'all' },
                { label: 'Chọn nhiều học viên', value: 'selected' },
                { label: 'Một học viên', value: 'single' },
              ]}
            />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev.mode !== cur.mode || prev.class_id !== cur.class_id}>
            {({ getFieldValue }) => {
              const mode = getFieldValue('mode');
              if (mode === 'all') return null;

              return (
                <Form.Item
                  name="student_ids"
                  label="Học viên"
                  rules={[{ required: true, message: 'Chọn học viên cần tạo invoice' }]}
                >
                  <Select
                    mode={mode === 'single' ? undefined : 'multiple'}
                    placeholder="Chọn học viên"
                    value={selectedStudentIds as any}
                    onChange={(value) => setSelectedStudentIds(Array.isArray(value) ? value : [value])}
                    options={(template?.students || []).map((student: any) => ({
                      label: `${student.full_name}${student.email ? ` - ${student.email}` : ''}`,
                      value: student.id,
                    }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Space size={12} className="w-full" align="start">
            <Form.Item name="due_date" label="Hạn thu" className="flex-1">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="discount_amount" label="Giảm giá" className="flex-1">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Space>

          <Form.Item name="extra_item_enabled" label="Khoản thu thêm">
            <Select
              options={[
                { label: 'Không thêm khoản thu khác', value: false },
                { label: 'Thêm một khoản thu khác', value: true },
              ]}
            />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev.extra_item_enabled !== cur.extra_item_enabled}>
            {({ getFieldValue }) => getFieldValue('extra_item_enabled') ? (
              <Space direction="vertical" className="w-full">
                <Form.Item name="extra_item_type" label="Loại phí thêm">
                  <Select
                    options={[
                      { label: 'Tài liệu', value: 'material' },
                      { label: 'Thi thử', value: 'exam' },
                      { label: 'Lệ phí đăng ký', value: 'registration' },
                      { label: 'Khác', value: 'other' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="extra_item_description" label="Mô tả phí thêm" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="extra_item_amount" label="Số tiền phí thêm" rules={[{ required: true }]}>
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
              </Space>
            ) : null}
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

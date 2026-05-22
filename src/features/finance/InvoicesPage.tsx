import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message, Alert, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';
import { classService } from '../../services/api/class.service';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export function InvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [template, setTemplate] = useState<any | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
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
    { title: 'Mã invoice', dataIndex: 'invoice_no', width: 160 },
    { title: 'Học viên', render: (_, record) => record.student?.full_name },
    { title: 'Lớp', render: (_, record) => record.class?.name || '-' },
    { title: 'Tổng phí', dataIndex: 'total_amount', align: 'right', render: money },
    { title: 'Giảm giá', dataIndex: 'discount_amount', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', align: 'right', render: money },
    { title: 'Còn nợ', dataIndex: 'remaining_amount', align: 'right', render: money },
    { title: 'Hạn thu', dataIndex: 'due_date', render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-' },
    { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color={status === 'paid' ? 'green' : status === 'partial' ? 'blue' : 'orange'}>{status}</Tag> },
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
        <Table loading={loading} rowKey="id" columns={columns} dataSource={invoices} pagination={{ pageSize: 10 }} />
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

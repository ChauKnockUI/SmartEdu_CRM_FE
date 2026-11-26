import { useListLocation } from '../../shared/hooks/useListLocation';
import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, message, Alert, Typography } from 'antd';
import { ClockCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';
import { classService } from '../../services/api/class.service';
import { InvoiceDetailDrawer } from './InvoiceDetailDrawer';
import { BillingStatusTag, billingStatusMeta as statusMeta, getInvoiceStatus as invoiceStatus, isCollectibleInvoice, sumBillingMoney, billingDate } from './billingStatus';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const templateRequest = useRef(0);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [template, setTemplate] = useState<any | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const { params, page, pageSize, setPage, choice, update } = useListLocation({ status: 'active' });
  const query = (params.get('search') || '').slice(0, 200);
  const statusFilter = choice('status', ['active', 'all', 'overdue', 'partial', 'pending', 'paid', 'cancelled', 'refunded']);
  const [form] = Form.useForm();
  const extraEnabled = Form.useWatch('extra_item_enabled', form);
  const extraAmount = Form.useWatch('extra_item_amount', form);
  const discount = Form.useWatch('discount_amount', form);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await financeService.getAllInvoices();
      setInvoices(res.data || []);
    } catch (err: any) {
      setInvoices([]); setLoadError(err.message || 'Không tải được danh sách khoản phải thu');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    setClassesLoading(true); setClassesError('');
    try {
      const res = await classService.getAll({ page: 1, limit: 100 });
      let all = res.data || [];
      for (let page = 2; page <= (res.pagination?.totalPages || 1); page++) {
        const next = await classService.getAll({ page, limit: 100 });
        all = all.concat(next.data || []);
      }
      setClasses(all);
    } catch (err: any) { setClasses([]); setClassesError(err.message || 'Không tải được danh sách lớp'); }
    finally { setClassesLoading(false); }
  };

  useEffect(() => {
    loadInvoices();
    loadClasses();
  }, []);

  const handleClassChange = async (classId: number) => {
    const request = ++templateRequest.current;
    setTemplateLoading(true);
    form.setFieldsValue({ student_ids: [] });
    setSelectedStudentIds([]);
    setTemplate(null);
    try {
      const res = await financeService.getClassFeeTemplate(classId);
      if (request !== templateRequest.current) return;
      setTemplate(res.data);
    } catch (err: any) {
      if (request === templateRequest.current) message.error(err.message || 'Không tải được cấu hình phí của lớp');
    } finally { if (request === templateRequest.current) setTemplateLoading(false); }
  };

  const templateTotal = useMemo(
    () => (template?.items || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
    [template]
  );
  const totalFee = Math.round((templateTotal + (extraEnabled ? Number(extraAmount || 0) : 0)) * 100) / 100;

  const rows = useMemo(() => invoices
    .map((invoice) => ({ ...invoice, view_status: invoiceStatus(invoice) }))
    .filter((invoice) => {
      if (statusFilter === 'active') return isCollectibleInvoice(invoice);
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
      const rank = { overdue: 0, partial: 1, pending: 2, paid: 3, cancelled: 4, refunded: 5, unknown: 6 } as Record<string, number>;
      const priority = rank[a.view_status] - rank[b.view_status];
      if (priority !== 0) return priority;
      return new Date(a.due_date || '2999-01-01').getTime() - new Date(b.due_date || '2999-01-01').getTime();
    }), [invoices, query, statusFilter]);

  useEffect(() => {
    const last = Math.max(1, Math.ceil(rows.length / pageSize));
    if (!loading && !loadError && page > last) setPage(last);
  }, [rows.length, page, pageSize, loading, loadError]);

  const summary = useMemo(() => {
    const active = invoices.filter(isCollectibleInvoice);
    return {
      activeAmount: sumBillingMoney(active, 'remaining_amount'),
      overdueAmount: sumBillingMoney(active.filter(item => invoiceStatus(item) === 'overdue'), 'remaining_amount'),
      partialCount: active.filter((item) => invoiceStatus(item) === 'partial').length,
      paidCount: invoices.filter((item) => invoiceStatus(item) === 'paid').length,
    };
  }, [invoices]);

  const submitCreate = async () => {
    if (creatingRef.current || templateLoading || !template) return;
    creatingRef.current = true; setCreating(true);
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

      const skipped = res.data?.skipped || [];
      const created = res.data?.created?.length ?? 1;
      setCreateResult(skipped.length ? { created, skipped } : null);
      if (skipped.length) message.warning(`Đã tạo ${created} khoản thu; ${skipped.length} học viên chưa được tạo. Xem lý do bên dưới.`);
      else message.success(`Đã tạo ${created} khoản phải thu`);
      setCreateOpen(false);
      form.resetFields();
      setTemplate(null);
      setSelectedStudentIds([]);
      loadInvoices();
    } catch (err: any) {
      if (!err.errorFields) message.error(err.message || 'Tạo khoản phải thu thất bại');
    } finally { creatingRef.current = false; setCreating(false); }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Ưu tiên',
      width: 120,
      render: (_, record) => {
        if (record.view_status === 'overdue') return <Tag color="red" icon={<WarningOutlined />}>Quá hạn</Tag>;
        if (record.view_status === 'partial') return <Tag color="blue" icon={<ClockCircleOutlined />}>Còn thiếu</Tag>;
        return <BillingStatusTag status={record.view_status} />;
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
      title: 'Lớp / Khoản phải thu',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.class?.name || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.invoice_no}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Phải thu sau giảm giá', dataIndex: 'payable_amount', width: 160, className: 'crm-money-cell', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', width: 145, className: 'crm-money-cell', align: 'right', render: money },
    { title: 'Còn lại', dataIndex: 'remaining_amount', width: 145, className: 'crm-money-cell', align: 'right', render: (value) => <Typography.Text strong>{money(value)}</Typography.Text> },
    { title: 'Hạn thu', dataIndex: 'due_date', render: billingDate },
    { title: 'Trạng thái', render: (_, record) => <BillingStatusTag status={record.view_status} /> },
    { title: '', render: (_, record) => <Button type="link" onClick={() => setDetailId(record.id)}>Chi tiết</Button> },
  ];

  return (
    <div className="crm-page">
      <PageHeader
        title="Khoản phải thu"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Tài chính' },
          { title: 'Khoản phải thu' },
        ]}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadInvoices}>Tải lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo khoản phải thu theo lớp</Button>
          </Space>
        }
      />

      {loadError && <Alert className="mb-4" type="error" showIcon message={loadError} />}
      {createResult && <Alert className="mb-4" type="warning" showIcon closable onClose={() => setCreateResult(null)}
        message={`Đã tạo ${createResult.created} khoản thu; ${createResult.skipped.length} học viên chưa được tạo`}
        description={<ul>{createResult.skipped.map((item: any) => <li key={item.student_id}>{item.student_name || `#${item.student_id}`}: {item.reason}</li>)}</ul>} />}
      <Card>
        {!loadError && <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title="Đang phải thu" value={summary.activeAmount} formatter={(value) => money(Number(value))} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title="Quá hạn" value={summary.overdueAmount} valueStyle={{ color: '#cf1322' }} formatter={(value) => money(Number(value))} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title={statusMeta.partial.label} value={summary.partialCount} /></Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small"><Statistic title={statusMeta.paid.label} value={summary.paidCount} /></Card>
          </Col>
        </Row>}

        <Space className="crm-filter-controls mb-4 w-full" size={12} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            aria-label="Tìm theo học viên, số điện thoại, email, lớp hoặc mã khoản thu"
            placeholder="Học viên, SĐT, email, lớp, mã thu"
            value={query}
            onChange={event => update({ search: event.target.value }, true, true)}
            className="crm-filter-search"
          />
          <Select
            value={statusFilter}
            onChange={status => update({ status })}
            className="crm-filter-status"
            options={[
              { label: 'Đang phải thu', value: 'active' },
              { label: 'Quá hạn', value: 'overdue' },
              { label: statusMeta.partial.label, value: 'partial' },
              { label: statusMeta.pending.label, value: 'pending' },
              { label: statusMeta.paid.label, value: 'paid' },
              { label: statusMeta.cancelled.label, value: 'cancelled' },
              { label: statusMeta.refunded.label, value: 'refunded' },
              { label: 'Tất cả', value: 'all' },
            ]}
          />
        </Space>

        <Table
          loading={loading}
          rowKey="id"
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: loadError ? 'Chưa tải được khoản phải thu' : 'Không có khoản phải thu phù hợp' }}
          scroll={{ x: 1120 }}
          pagination={paginationProps('khoản phải thu', { current: page, pageSize, onChange: (next, size) => setPage(size === pageSize ? next : 1, size) })}
        />
      </Card>

      <InvoiceDetailDrawer invoiceId={detailId} onClose={() => setDetailId(null)} onChanged={loadInvoices} />

      <Modal
        title="Tạo khoản phải thu theo lớp"
        open={createOpen}
        width={760}
        onCancel={() => { templateRequest.current++; setTemplateLoading(false); setCreateOpen(false); form.resetFields(); setTemplate(null); setSelectedStudentIds([]); }}
        onOk={submitCreate}
        confirmLoading={creating}
        okButtonProps={{ disabled: !template || templateLoading }}
        cancelButtonProps={{ disabled: creating }} closable={!creating} maskClosable={!creating} keyboard={!creating}
        okText="Tạo khoản phải thu"
      >
        <Form form={form} disabled={creating} layout="vertical" initialValues={{ mode: 'all', discount_amount: 0, extra_item_type: 'material' }}>
          {classesError && <Alert className="mb-4" type="error" message={classesError} action={<Button loading={classesLoading} onClick={loadClasses}>Thử lại</Button>} />}
          <Form.Item name="class_id" label="Lớp" rules={[{ required: true }]}>
            <Select
              loading={classesLoading}
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

          {templateLoading && <Typography.Paragraph type="secondary">Đang tải mẫu phí…</Typography.Paragraph>}
          {template && (
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message={`Mẫu phí: ${money(templateTotal)} cho ${template.students?.length || 0} học viên đang ghi danh`}
              description={
                <Space direction="vertical" size={2}>
                  {(template.items || []).map((item: any, index: number) => (
                    <Typography.Text key={index}>{item.description}: {money(item.amount)}</Typography.Text>
                  ))}
                </Space>
              }
            />
          )}

          <Form.Item name="mode" label="Phạm vi tạo khoản phải thu" rules={[{ required: true }]}>
            <Select
              onChange={() => { form.setFieldValue('student_ids', undefined); setSelectedStudentIds([]); }}
              options={[
                { label: 'Tất cả học viên đang ghi danh trong lớp', value: 'all' },
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
                  rules={[{ required: true, message: 'Chọn học viên cần tạo khoản phải thu' }]}
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
            <Form.Item name="discount_amount" label="Giảm giá" className="flex-1" dependencies={['extra_item_enabled', 'extra_item_amount', 'class_id']}
              rules={[{ type: 'number', min: 0, max: totalFee, message: 'Giảm giá không được vượt tổng các khoản phí.' }]}>
              <InputNumber min={0} max={totalFee} precision={2} className="w-full" />
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
                  <Input maxLength={255} />
                </Form.Item>
                <Form.Item name="extra_item_amount" label="Số tiền phí thêm" rules={[{ required: true }]}>
                  <InputNumber min={0.01} precision={2} className="w-full" />
                </Form.Item>
              </Space>
            ) : null}
          </Form.Item>

          {template && <Typography.Paragraph>Phải thu mỗi học viên sau giảm giá: <strong>{money(Math.max(totalFee - Number(discount || 0), 0))}</strong></Typography.Paragraph>}
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

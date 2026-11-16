import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Alert,
} from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';
import { useSearchParams } from 'react-router';
import { BillingStatusTag, billingStatusMeta as statusMeta, getInvoiceStatus as getCollectionStatus,
  isCollectibleInvoice, sumBillingMoney, billingDate } from './billingStatus';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  vnpay: 'VNPay',
  other: 'Khác',
};

const getPriority = (invoice: any) => {
  const status = getCollectionStatus(invoice);
  if (status === 'overdue') return 0;
  if (status === 'partial') return 1;
  return 2;
};

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const requestedId = Number(params.get('invoice_id'));
  const invoiceId = Number.isInteger(requestedId) && requestedId > 0 && requestedId <= 2147483647 ? requestedId : undefined;
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const paymentInFlight = useRef(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(invoiceId ? 'all' : 'collecting');
  const [form] = Form.useForm();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await financeService.getAllInvoices({ invoice_id: invoiceId });
      setInvoices(res.data || []);
    } catch (err: any) {
      setInvoices([]); setLoadError(err.message || 'Không tải được dữ liệu thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStatusFilter(invoiceId ? 'all' : 'collecting'); setQuery('');
    loadInvoices();
  }, [invoiceId]);

  const rows = useMemo(() => {
    const normalized = invoices.map((invoice) => ({
      ...invoice,
      collection_status: getCollectionStatus(invoice),
      paid_percent: Math.min(
        invoice.payable_amount > 0 ? Math.round(Number(invoice.paid_amount || 0) / Number(invoice.payable_amount) * 100)
          : getCollectionStatus(invoice) === 'paid' ? 100 : 0,
        100
      ),
    }));

    return normalized
      .filter((invoice) => {
        if (statusFilter === 'collecting') return isCollectibleInvoice(invoice);
        if (statusFilter === 'all') return true;
        return invoice.collection_status === statusFilter;
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
        const priority = getPriority(a) - getPriority(b);
        if (priority !== 0) return priority;
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
  }, [invoices, query, statusFilter]);

  const transactions = useMemo(
    () => invoices.flatMap((invoice) =>
      (invoice.payments || []).map((payment: any) => ({
        ...payment,
        invoice_no: invoice.invoice_no,
        student_name: invoice.student?.full_name,
        class_name: invoice.class?.name,
      }))
    ).sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()),
    [invoices]
  );

  const summary = useMemo(() => {
    const collecting = invoices.filter(isCollectibleInvoice);
    return {
      totalDebt: sumBillingMoney(collecting, 'remaining_amount'),
      overdueDebt: sumBillingMoney(collecting.filter(item => getCollectionStatus(item) === 'overdue'), 'remaining_amount'),
      partialCount: collecting.filter((item) => getCollectionStatus(item) === 'partial').length,
      paidThisView: sumBillingMoney(invoices, 'paid_amount'),
    };
  }, [invoices]);

  const openPaymentModal = (invoice: any) => {
    if (!isCollectibleInvoice(invoice)) return;
    setSelectedInvoice(invoice);
    form.resetFields();
    form.setFieldsValue({
      amount: invoice.remaining_amount,
      method: 'bank_transfer',
    });
    setPaymentOpen(true);
  };

  const submitPayment = async () => {
    if (paymentInFlight.current) return;
    paymentInFlight.current = true;
    setPaymentSubmitting(true);
    try {
      const values = await form.validateFields();
      const result = await financeService.recordPayment(selectedInvoice.id, values);
      if (result.data?.dropout_risk_update === 'failed') {
        message.warning('Đã ghi nhận thanh toán. Chưa cập nhật được nguy cơ bỏ học; hãy đánh giá lại trong hồ sơ học viên.');
      } else if (result.data?.dropout_risk_update === 'partial') {
        message.warning('Đã ghi nhận thanh toán và cập nhật cảnh báo. AI đang tạm gián đoạn; hãy đánh giá lại sau.');
      } else {
        message.success('Đã ghi nhận thanh toán');
      }
      setPaymentOpen(false);
      loadInvoices();
    } catch (err: any) {
      message.error(err.message || 'Ghi nhận thanh toán thất bại');
    } finally {
      paymentInFlight.current = false;
      setPaymentSubmitting(false);
    }
  };

  const collectionColumns: ColumnsType<any> = [
    {
      title: 'Ưu tiên',
      width: 120,
      render: (_, record) => {
        const status = record.collection_status;
        if (status === 'overdue') {
          return <Tag color="red" icon={<WarningOutlined />}>Trễ {record.days_overdue} ngày</Tag>;
        }
        if (status === 'partial') {
          return <Tag color="blue" icon={<ClockCircleOutlined />}>Còn thiếu</Tag>;
        }
        return <BillingStatusTag status={status} />;
      },
    },
    {
      title: 'Học viên',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.student?.full_name}</Typography.Text>
          <Typography.Text type="secondary">{record.student?.phone || record.student?.email || '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Lớp / Invoice',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.class?.name || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.invoice_no}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Tiến độ thu',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4} className="w-full">
          <Progress percent={record.paid_percent} size="small" status={record.collection_status === 'overdue' ? 'exception' : 'active'} />
          <Typography.Text type="secondary">
            Đã thu {money(record.paid_amount)} / {money(record.payable_amount)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Còn phải thu',
      dataIndex: 'remaining_amount',
      align: 'right',
      width: 150,
      render: (value) => <Typography.Text strong>{money(value)}</Typography.Text>,
      sorter: (a, b) => Number(a.remaining_amount || 0) - Number(b.remaining_amount || 0),
    },
    {
      title: 'Hạn thu',
      width: 130,
      render: (_, record) => billingDate(record.due_date),
      sorter: (a, b) => new Date(a.due_date || '2999-01-01').getTime() - new Date(b.due_date || '2999-01-01').getTime(),
    },
    {
      title: 'Trạng thái',
      width: 130,
      render: (_, record) => {
        return <BillingStatusTag status={record.collection_status} />;
      },
    },
    {
      title: '',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button type="primary" disabled={!isCollectibleInvoice(record)} onClick={() => openPaymentModal(record)}>
          Thu tiền
        </Button>
      ),
    },
  ];

  const transactionColumns: ColumnsType<any> = [
    { title: 'Mã GD', dataIndex: 'id', width: 90, render: (id) => `#${id}` },
    { title: 'Invoice', dataIndex: 'invoice_no', width: 160 },
    { title: 'Học viên', dataIndex: 'student_name' },
    { title: 'Lớp', dataIndex: 'class_name', render: (value) => value || '-' },
    { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: money },
    { title: 'Phương thức', dataIndex: 'method', render: (value) => <Tag>{METHOD_LABELS[value] || value}</Tag> },
    { title: 'Ngày thu', dataIndex: 'paid_at', render: (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '-' },
    { title: 'Mã đối soát', dataIndex: 'reference_code', render: (value) => value || '-' },
  ];

  return (
    <div>
      <PageHeader
        title="Thu học phí"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Tài chính' },
          { title: 'Thu học phí' },
        ]}
        actions={<Button icon={<ReloadOutlined />} onClick={loadInvoices}>Tải lại</Button>}
      />

      {loadError && <Alert className="mb-4" type="error" showIcon message={loadError} />}
      {invoiceId && <Alert className="mb-4" type={!loading && !loadError && !invoices.length ? 'warning' : 'info'} showIcon
        message={!loading && !loadError && !invoices.length ? 'Không tìm thấy khoản phải thu trong phạm vi được xem.' : `Khoản phải thu đang xem: ${invoices[0]?.invoice_no || 'Đang tải…'}`}
        action={<Button size="small" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('invoice_id'); return next; })}>Xem tất cả</Button>} />}
      {!loadError && <Row gutter={16} className="mb-4">
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Cần thu" value={summary.totalDebt} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Quá hạn" value={summary.overdueDebt} valueStyle={{ color: '#cf1322' }} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title={statusMeta.partial.label} value={summary.partialCount} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Đã ghi nhận" value={summary.paidThisView} valueStyle={{ color: '#3f8600' }} formatter={(value) => money(Number(value))} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
      </Row>}

      <Card>
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
            style={{ width: 220 }}
            options={[
              { label: 'Cần xử lý', value: 'collecting' },
              { label: 'Quá hạn', value: 'overdue' },
              { label: statusMeta.partial.label, value: 'partial' },
              { label: statusMeta.pending.label, value: 'pending' },
              { label: statusMeta.paid.label, value: 'paid' },
              { label: statusMeta.cancelled.label, value: 'cancelled' },
              { label: statusMeta.refunded.label, value: 'refunded' },
              { label: 'Tất cả', value: 'all' },
            ]}
          />
          <Badge count={rows.length} showZero color="#1677ff" />
        </Space>

        <Tabs
          items={[
            {
              key: 'queue',
              label: 'Hàng đợi thu tiền',
              children: (
                <Table
                  loading={loading}
                  columns={collectionColumns}
                  dataSource={rows}
                  locale={{ emptyText: loadError ? 'Chưa tải được khoản phải thu' : 'Không có khoản phải thu phù hợp' }}
                  rowKey="id"
                  scroll={{ x: 1280 }}
                  pagination={{ pageSize: 12, showTotal: (total) => `${total} khoản cần xem` }}
                />
              ),
            },
            {
              key: 'transactions',
              label: 'Lịch sử giao dịch',
              children: (
                <Table
                  loading={loading}
                  columns={transactionColumns}
                  dataSource={transactions}
                  rowKey="id"
                  pagination={{ pageSize: 12 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={`Thu tiền ${selectedInvoice?.invoice_no || ''}`}
        open={paymentOpen}
        onCancel={() => setPaymentOpen(false)}
        onOk={submitPayment}
        confirmLoading={paymentSubmitting}
        cancelButtonProps={{ disabled: paymentSubmitting }}
        closable={!paymentSubmitting}
        maskClosable={!paymentSubmitting}
        keyboard={!paymentSubmitting}
        okText="Ghi nhận"
      >
        {selectedInvoice && (
          <Card size="small" className="mb-4">
            <Space direction="vertical" size={2}>
              <Typography.Text strong>{selectedInvoice.student?.full_name}</Typography.Text>
              <Typography.Text type="secondary">{selectedInvoice.class?.name}</Typography.Text>
              <Typography.Text>Còn phải thu: <strong>{money(selectedInvoice.remaining_amount)}</strong></Typography.Text>
            </Space>
          </Card>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true },
            { type: 'number', min: 0.01, max: Number(selectedInvoice?.remaining_amount || 0), message: 'Số tiền phải lớn hơn 0 và không vượt số dư còn phải thu.' }]}>
            <InputNumber min={0.01} precision={2} max={Number(selectedInvoice?.remaining_amount || 0)} className="w-full" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
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
          <Form.Item name="reference_code" label="Mã giao dịch / đối soát">
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

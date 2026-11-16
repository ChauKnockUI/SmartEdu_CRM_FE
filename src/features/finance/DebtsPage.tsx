import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, Progress, Row, Select, Space, Statistic, Table, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';
import { BillingStatusTag, billingStatusMeta as statusMeta, getInvoiceStatus as statusOf, sumBillingMoney, billingDate, invoiceCollectionLink } from './billingStatus';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export function DebtsPage() {
  const { openDetail } = useDetailNavigation();
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const loadDebts = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await financeService.getDebts();
      setDebts(res.data || []);
    } catch (err: any) {
      setDebts([]); setLoadError(err.message || 'Không tải được công nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const rows = useMemo(() => debts
    .map((row) => ({ ...row, view_status: statusOf(row) }))
    .filter((row) => filter === 'all' || row.view_status === filter)
    .filter((row) => {
      const haystack = [
        row.invoice_no,
        row.student?.full_name,
        row.student?.email,
        row.student?.phone,
        row.class?.name,
      ].join(' ').toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => {
      const rank = { overdue: 0, partial: 1, pending: 2 } as Record<string, number>;
      const priority = rank[a.view_status] - rank[b.view_status];
      if (priority !== 0) return priority;
      return Number(b.debt_amount || 0) - Number(a.debt_amount || 0);
    }), [debts, filter, query]);

  const totalDebt = sumBillingMoney(debts, 'debt_amount');
  const overdueDebt = sumBillingMoney(debts.filter(item => statusOf(item) === 'overdue'), 'debt_amount');
  const partialCount = debts.filter((item) => statusOf(item) === 'partial').length;

  const columns: ColumnsType<any> = [
    {
      title: 'Mức ưu tiên',
      width: 130,
      render: (_, record) => {
        return <Space direction="vertical" size={0}><BillingStatusTag status={record.view_status} />
          {record.days_overdue > 0 && <Typography.Text type="danger">Trễ {record.days_overdue} ngày</Typography.Text>}</Space>;
      },
    },
    {
      title: 'Học viên',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Button type="link" className="p-0" onClick={() => openDetail(`/lms/students/${record.student.id}?tab=finance`)}>{record.student?.full_name}</Button>
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
    {
      title: 'Tiến độ',
      width: 220,
      render: (_, record) => {
        const payable = Math.max(Number(record.payable_amount || 0), 1);
        const percent = Math.round((Number(record.paid_amount || 0) / payable) * 100);
        return (
          <Space direction="vertical" size={4} className="w-full">
            <Progress percent={percent} size="small" status={record.view_status === 'overdue' ? 'exception' : 'active'} />
            <Typography.Text type="secondary">Đã thu {money(record.paid_amount)}</Typography.Text>
          </Space>
        );
      },
    },
    { title: 'Còn nợ', dataIndex: 'debt_amount', align: 'right', width: 150, render: (value) => <Typography.Text strong>{money(value)}</Typography.Text>, sorter: (a, b) => Number(a.debt_amount || 0) - Number(b.debt_amount || 0) },
    { title: 'Hạn thu', dataIndex: 'due_date', width: 130, render: billingDate },
    { title: 'Thao tác', width: 180, render: (_, record) => <Button type="link" onClick={() => openDetail(invoiceCollectionLink(record.invoice_id))}>Xem khoản phải thu</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Công nợ học viên"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Tài chính' },
          { title: 'Công nợ' },
        ]}
        actions={<Button icon={<ReloadOutlined />} onClick={loadDebts}>Tải lại</Button>}
      />

      {loadError && <Alert className="mb-4" type="error" showIcon message={loadError} />}
      {!loadError && <Row gutter={16} className="mb-4">
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title="Tổng công nợ" value={totalDebt} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title="Nợ quá hạn" value={overdueDebt} valueStyle={{ color: '#cf1322' }} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title="Đang thu một phần" value={partialCount} /></Card>
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
            value={filter}
            onChange={setFilter}
            style={{ width: 180 }}
            options={[
              { label: 'Tất cả công nợ', value: 'all' },
              { label: 'Quá hạn', value: 'overdue' },
              { label: statusMeta.partial.label, value: 'partial' },
              { label: statusMeta.pending.label, value: 'pending' },
            ]}
          />
        </Space>

        <Table
          loading={loading}
          rowKey="invoice_id"
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: loadError ? 'Chưa tải được công nợ' : 'Không có công nợ phù hợp' }}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 12, showTotal: (total) => `${total} khoản công nợ` }}
        />
      </Card>
    </div>
  );
}

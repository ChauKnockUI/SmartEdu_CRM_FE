import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { ClockCircleOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const daysUntil = (date?: string) => {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const statusOf = (row: any) => {
  const diff = daysUntil(row.due_date);
  if (diff !== null && diff < 0) return 'overdue';
  if (Number(row.paid_amount || 0) > 0) return 'partial';
  return 'pending';
};

export function DebtsPage() {
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const loadDebts = async () => {
    try {
      setLoading(true);
      const res = await financeService.getDebts();
      setDebts(res.data || []);
    } catch (err: any) {
      message.error(err.message || 'Không tải được công nợ');
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

  const totalDebt = debts.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
  const overdueDebt = debts.filter((item) => statusOf(item) === 'overdue').reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
  const partialCount = debts.filter((item) => statusOf(item) === 'partial').length;

  const columns: ColumnsType<any> = [
    {
      title: 'Mức ưu tiên',
      width: 130,
      render: (_, record) => {
        const diff = daysUntil(record.due_date);
        if (record.view_status === 'overdue') return <Tag color="red" icon={<WarningOutlined />}>Trễ {Math.abs(diff || 0)} ngày</Tag>;
        if (record.view_status === 'partial') return <Tag color="blue" icon={<ClockCircleOutlined />}>Còn thiếu</Tag>;
        return <Tag color="orange">Chưa thu</Tag>;
      },
    },
    {
      title: 'Học viên',
      width: 260,
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
    {
      title: 'Tiến độ',
      width: 220,
      render: (_, record) => {
        const payable = Math.max(Number(record.total_amount || 0) - Number(record.discount_amount || 0), 1);
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
    { title: 'Hạn thu', dataIndex: 'due_date', width: 130, render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-' },
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

      <Row gutter={16} className="mb-4">
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title="Tổng công nợ" value={totalDebt} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title="Nợ quá hạn" value={overdueDebt} valueStyle={{ color: '#cf1322' }} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card><Statistic title="Đang thu một phần" value={partialCount} /></Card>
        </Col>
      </Row>

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
              { label: 'Thu một phần', value: 'partial' },
              { label: 'Chưa thu', value: 'pending' },
            ]}
          />
        </Space>

        <Table
          loading={loading}
          rowKey="invoice_id"
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 12, showTotal: (total) => `${total} khoản công nợ` }}
        />
      </Card>
    </div>
  );
}

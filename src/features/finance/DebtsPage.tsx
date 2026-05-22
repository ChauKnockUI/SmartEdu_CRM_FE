import { useEffect, useState } from 'react';
import { Button, Card, Statistic, Table, Tag, message, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { financeService } from '../../services/api/finance.service';

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export function DebtsPage() {
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);

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

  const totalDebt = debts.reduce((sum, item) => sum + Number(item.debt_amount || 0), 0);
  const overdueCount = debts.filter((item) => item.status === 'overdue').length;

  const columns: ColumnsType<any> = [
    { title: 'Invoice', dataIndex: 'invoice_no', width: 160 },
    { title: 'Học viên', render: (_, record) => record.student?.full_name },
    { title: 'Lớp', render: (_, record) => record.class?.name || '-' },
    { title: 'Phải thu', dataIndex: 'total_amount', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', align: 'right', render: money },
    { title: 'Còn nợ', dataIndex: 'debt_amount', align: 'right', render: money },
    {
      title: 'Hạn thu',
      dataIndex: 'due_date',
      render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <Tag color={status === 'overdue' ? 'red' : 'orange'}>{status}</Tag>,
    },
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
        <Col span={8}>
          <Card><Statistic title="Tổng công nợ" value={totalDebt} formatter={(value) => money(Number(value))} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Số invoice còn nợ" value={debts.length} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Quá hạn" value={overdueCount} /></Card>
        </Col>
      </Row>

      <Card>
        <Table loading={loading} rowKey="invoice_id" columns={columns} dataSource={debts} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}

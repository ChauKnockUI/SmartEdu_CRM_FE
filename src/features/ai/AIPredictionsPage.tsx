import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Button, Space, Select, Progress, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { studentService } from '@/services/api/student.service';

type DropoutPredictionRow = {
  id: number;
  full_name: string;
  email?: string;
  dropout_risk?: number | null;
  dropout_risk_level?: 'low' | 'medium' | 'high' | null;
  dropout_risk_updated_at?: string | null;
  dropout_risk_reasons?: string[] | null;
};

const riskColors: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const riskLabels: Record<string, string> = {
  low: 'Thap',
  medium: 'Trung binh',
  high: 'Cao',
};

export function AIPredictionsPage() {
  const [students, setStudents] = useState<DropoutPredictionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>();

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const res = await studentService.getAll({ page: 1, limit: 300 });
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Khong tai duoc dropout predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const data = useMemo(() => {
    return students
      .filter((student) => student.dropout_risk !== null && student.dropout_risk !== undefined)
      .filter((student) => !riskFilter || student.dropout_risk_level === riskFilter)
      .sort((a, b) => Number(b.dropout_risk || 0) - Number(a.dropout_risk || 0));
  }, [students, riskFilter]);

  const columns: ColumnsType<DropoutPredictionRow> = [
    {
      title: 'Hoc vien',
      key: 'student',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span className="font-medium">{record.full_name}</span>
          <span className="text-gray-500">{record.email || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Loai',
      key: 'targetType',
      render: () => <Tag>Hoc vien</Tag>,
    },
    {
      title: 'Diem',
      dataIndex: 'dropout_risk',
      key: 'score',
      sorter: (a, b) => Number(a.dropout_risk || 0) - Number(b.dropout_risk || 0),
      render: (score: number) => (
        <div style={{ width: 120 }}>
          <Progress percent={Number(score || 0)} size="small" />
        </div>
      ),
    },
    {
      title: 'Muc do rui ro',
      dataIndex: 'dropout_risk_level',
      key: 'risk',
      render: (risk: string) => (
        <Tag color={riskColors[risk] || 'default'}>
          {riskLabels[risk] || risk}
        </Tag>
      ),
    },
    {
      title: 'Ly do chinh',
      key: 'reasons',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {(record.dropout_risk_reasons || []).slice(0, 2).map((reason, index) => (
            <span key={`${record.id}-${index}`}>{reason}</span>
          ))}
        </Space>
      ),
    },
    {
      title: 'Ngay du doan',
      dataIndex: 'dropout_risk_updated_at',
      key: 'createdAt',
      render: (date: string) => (date ? new Date(date).toLocaleDateString('vi-VN') : '-'),
    },
    {
      title: 'Hanh dong',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" size="small" href={`/lms/students/${record.id}`}>
          Chi tiet
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="AI Predictions"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'AI & Insights' },
          { title: 'Predictions' },
        ]}
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            placeholder="Loai"
            style={{ width: 180 }}
            allowClear
            value="student"
            options={[{ label: 'Hoc vien', value: 'student' }]}
          />
          <Select
            placeholder="Muc do rui ro"
            style={{ width: 180 }}
            allowClear
            value={riskFilter}
            onChange={setRiskFilter}
            options={[
              { label: 'Thap', value: 'low' },
              { label: 'Trung binh', value: 'medium' },
              { label: 'Cao', value: 'high' },
            ]}
          />
          <Select
            placeholder="Model"
            style={{ width: 200 }}
            allowClear
            value="dropout-v2"
            options={[{ label: 'Dropout Risk v2', value: 'dropout-v2' }]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tong ${total} predictions`,
          }}
        />
      </div>
    </div>
  );
}

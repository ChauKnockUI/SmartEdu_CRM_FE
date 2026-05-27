import { useEffect, useMemo, useState } from 'react';
import { Alert, Table, Tag, Button, Space, Select, Progress, message } from 'antd';
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
  low: 'Thấp',
  medium: 'Trung bình',
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
      message.error('Không tải được dữ liệu dự đoán dropout');
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
      title: 'Học viên',
      key: 'student',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span className="font-medium">{record.full_name}</span>
          <span className="text-gray-500">{record.email || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Loại',
      key: 'targetType',
      render: () => <Tag>Học viên</Tag>,
    },
    {
      title: 'Điểm',
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
      title: 'Mức độ rủi ro',
      dataIndex: 'dropout_risk_level',
      key: 'risk',
      render: (risk: string) => (
        <Tag color={riskColors[risk] || 'default'}>
          {riskLabels[risk] || risk}
        </Tag>
      ),
    },
    {
      title: 'Lý do chính',
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
      title: 'Ngày dự đoán',
      dataIndex: 'dropout_risk_updated_at',
      key: 'createdAt',
      render: (date: string) => (date ? new Date(date).toLocaleDateString('vi-VN') : '-'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" size="small" href={`/lms/students/${record.id}`}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dropout Risk"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'AI & Insights' },
          { title: 'Dropout Risk' },
        ]}
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Danh sách này chỉ hiển thị học viên đã được tính dropout risk."
          description="Để tạo dữ liệu, vào LMS > Học viên > Chi tiết học viên và bấm Tính lại risk, hoặc điểm danh một buổi học để hệ thống tự cập nhật risk."
        />
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            placeholder="Loại"
            style={{ width: 180 }}
            allowClear
            value="student"
            options={[{ label: 'Học viên', value: 'student' }]}
          />
          <Select
            placeholder="Mức độ rủi ro"
            style={{ width: 180 }}
            allowClear
            value={riskFilter}
            onChange={setRiskFilter}
            options={[
              { label: 'Thấp', value: 'low' },
              { label: 'Trung bình', value: 'medium' },
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
            showTotal: (total) => `Tổng ${total} dự đoán`,
          }}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { Table, Tag, Button, Space, Select, Progress } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockAIPredictions } from '../../services/mock/mockData';
import type { AIPrediction } from '../../shared/types';

const riskColors = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const riskLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

export function AIPredictionsPage() {
  const columns: ColumnsType<AIPrediction> = [
    {
      title: 'ID',
      dataIndex: 'targetId',
      key: 'targetId',
      width: 120,
    },
    {
      title: 'Loại',
      dataIndex: 'targetType',
      key: 'targetType',
      filters: [
        { text: 'Lead', value: 'lead', key: 'filter-lead' },
        { text: 'Student', value: 'student', key: 'filter-student' },
      ],
      onFilter: (value, record) => record.targetType === value,
      render: (type: string) => (
        <Tag>{type === 'lead' ? 'Lead' : 'Học viên'}</Tag>
      ),
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      key: 'score',
      sorter: (a, b) => a.score - b.score,
      render: (score: number) => (
        <div style={{ width: 100 }}>
          <Progress percent={score} size="small" />
        </div>
      ),
    },
    {
      title: 'Mức độ rủi ro',
      dataIndex: 'risk',
      key: 'risk',
      filters: [
        { text: 'Thấp', value: 'low', key: 'filter-low' },
        { text: 'Trung bình', value: 'medium', key: 'filter-medium' },
        { text: 'Cao', value: 'high', key: 'filter-high' },
      ],
      onFilter: (value, record) => record.risk === value,
      render: (risk: AIPrediction['risk']) => (
        <Tag color={riskColors[risk]}>
          {riskLabels[risk]}
        </Tag>
      ),
    },
    {
      title: 'Ngày dự đoán',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      render: (date: Date) => date.toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small">
            Chi tiết
          </Button>
          <Button type="link" size="small">
            Xem features
          </Button>
        </Space>
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
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            placeholder="Lọc theo loại"
            style={{ width: 180 }}
            allowClear
            options={[
              { label: 'Lead', value: 'lead' },
              { label: 'Học viên', value: 'student' },
            ]}
          />
          <Select
            placeholder="Mức độ rủi ro"
            style={{ width: 180 }}
            allowClear
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
            options={[
              { label: 'Lead Scoring Model v2', value: 'model-1' },
              { label: 'Student Churn Predictor', value: 'model-2' },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={mockAIPredictions}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} predictions`,
          }}
        />
      </div>
    </div>
  );
}
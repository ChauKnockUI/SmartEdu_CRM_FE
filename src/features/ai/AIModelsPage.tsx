import React from 'react';
import { Table, Tag, Button, Space, Progress } from 'antd';
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockAIModels } from '../../services/mock/mockData';
import type { AIModel } from '../../shared/types';

const typeLabels = {
  lead_scoring: 'Lead Scoring',
  churn_prediction: 'Dự đoán Churn',
};

export function AIModelsPage() {
  const columns: ColumnsType<AIModel> = [
    {
      title: 'Tên Model',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: AIModel['type']) => typeLabels[type],
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: 'Độ chính xác',
      dataIndex: 'accuracy',
      key: 'accuracy',
      sorter: (a, b) => a.accuracy - b.accuracy,
      render: (accuracy: number) => (
        <div style={{ width: 150 }}>
          <Progress
            percent={Math.round(accuracy * 100)}
            size="small"
            status={accuracy >= 0.8 ? 'success' : 'normal'}
          />
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: AIModel['status']) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Huấn luyện lần cuối',
      dataIndex: 'lastTrainedAt',
      key: 'lastTrainedAt',
      sorter: (a, b) => a.lastTrainedAt.getTime() - b.lastTrainedAt.getTime(),
      render: (date: Date) => date.toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={record.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          >
            {record.status === 'active' ? 'Tắt' : 'Kích hoạt'}
          </Button>
          <Button type="link" size="small">
            Huấn luyện lại
          </Button>
          <Button type="link" size="small">
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý AI Models"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'AI & Insights' },
          { title: 'Models' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />}>
            Thêm Model
          </Button>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Table
          columns={columns}
          dataSource={mockAIModels}
          rowKey="id"
          pagination={false}
        />
      </div>
    </div>
  );
}

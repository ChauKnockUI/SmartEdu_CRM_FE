import React from 'react';
import { Card, Row, Col, Table, Tag, Progress } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockLeads, mockAIPredictions } from '../../services/mock/mockData';
import type { ColumnsType } from 'antd/es/table';

const scoreDistributionData = [
  { range: '0-20', leads: 5, students: 2 },
  { range: '21-40', leads: 12, students: 8 },
  { range: '41-60', leads: 25, students: 15 },
  { range: '61-80', leads: 35, students: 25 },
  { range: '81-100', leads: 23, students: 10 },
];

export function AIInsightsPage() {
  const highScoreLeads = mockLeads
    .filter(l => l.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const highRiskPredictions = mockAIPredictions
    .filter(p => p.risk === 'high')
    .slice(0, 5);

  const leadsColumns: ColumnsType<typeof highScoreLeads[0]> = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Progress percent={score} size="small" status="success" />
      ),
    },
  ];

  const predictionsColumns: ColumnsType<typeof highRiskPredictions[0]> = [
    {
      title: 'Target ID',
      dataIndex: 'targetId',
      key: 'targetId',
    },
    {
      title: 'Loại',
      dataIndex: 'targetType',
      key: 'targetType',
      render: (type: string) => (
        <Tag>{type === 'lead' ? 'Lead' : 'Học viên'}</Tag>
      ),
    },
    {
      title: 'Rủi ro',
      dataIndex: 'risk',
      key: 'risk',
      render: (risk: string) => (
        <Tag color="red">Cao</Tag>
      ),
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      key: 'score',
    },
  ];

  return (
    <div>
      <PageHeader
        title="AI Insights"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'AI & Insights' },
          { title: 'Insights' },
        ]}
      />

      {/* Score Distribution Chart */}
      <Card title="Phân phối điểm AI" className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={scoreDistributionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="leads" name="Leads" fill="#8884d8" />
            <Bar dataKey="students" name="Học viên" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Top High Score Leads */}
        <Col xs={24} lg={12}>
          <Card title="Top Leads điểm cao" className="h-full">
            <Table
              columns={leadsColumns}
              dataSource={highScoreLeads}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* High Risk Predictions */}
        <Col xs={24} lg={12}>
          <Card title="Cảnh báo rủi ro cao" className="h-full">
            <Table
              columns={predictionsColumns}
              dataSource={highRiskPredictions}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

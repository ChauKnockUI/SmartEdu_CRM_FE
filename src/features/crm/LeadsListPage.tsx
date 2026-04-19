import React, { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { leadService } from '@/services/api/lead.service';

export function LeadsListPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads(1);
  }, []);

  const fetchLeads = async (page: number) => {
    try {
      setLoading(true);

      const res = await leadService.getAll(page, pagination.pageSize);

      setLeads(res.data);
      setPagination({
        current: res.pagination.page,
        pageSize: res.pagination.limit,
        total: res.pagination.total,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===== AI helpers =====
  const getScore = (lead: any) =>
    lead.aiScore?.probability_score ?? 0;

  const getColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'orange';
    return 'red';
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'full_name',
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
    },
    {
      title: 'Nguồn',
      dataIndex: 'lead_source',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: 'Sale phụ trách',
      render: (_: any, record: any) =>
        record.assignedUser?.full_name || 'Chưa có',
    },
    {
      title: 'AI Score',
      render: (_: any, record: any) => {
        const score = getScore(record);
        return <Tag color={getColor(score)}>{score}%</Tag>;
      },
    },
    {
      title: 'Phân loại',
      render: (_: any, record: any) =>
        record.aiScore?.recommendation || 'N/A',
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={leads}
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: (page) => fetchLeads(page),
      }}
    />
  );
}
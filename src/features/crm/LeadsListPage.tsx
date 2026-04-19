import React, { useEffect, useState } from 'react';
import { Table, Card, Button } from 'antd';
import { PageHeader } from '@/shared/components/PageHeader';
import { leadService } from '@/services/api/lead.service';

export function LeadsListPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await leadService.getAll();

      setLeads(res.data || []);
    } catch (error) {
      console.error('Fetch leads error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <div>
      <PageHeader
        title="Leads"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads' },
        ]}
      />

      <Card
        extra={
          <Button type="primary">
            Tạo Lead
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={leads}
          loading={loading}
          columns={[
            {
              title: 'Tên',
              dataIndex: 'name',
            },
            {
              title: 'Email',
              dataIndex: 'email',
            },
            {
              title: 'SĐT',
              dataIndex: 'phone',
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
            },
          ]}
        />
      </Card>
    </div>
  );
}
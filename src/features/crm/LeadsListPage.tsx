import React, { useState } from 'react';
import { Table, Tag, Button, Space, Select, DatePicker, Input, Drawer, Form, InputNumber, message } from 'antd';
import {
  PlusOutlined,
  PhoneOutlined,
  MessageOutlined,
  UserAddOutlined,
  FilterOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockLeads } from '../../services/mock/mockData';
import type { Lead } from '../../shared/types';
import { useNavigate } from 'react-router';

const { RangePicker } = DatePicker;

const statusColors = {
  new: 'blue',
  contacted: 'cyan',
  qualified: 'green',
  converted: 'success',
  lost: 'default',
};

const statusLabels = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Đủ điều kiện',
  converted: 'Đã chuyển đổi',
  lost: 'Thất bại',
};

export function LeadsListPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(mockLeads);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<Lead> = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <a onClick={() => navigate(`/crm/leads/${record.id}`)} className="font-medium">
          {name}
        </a>
      ),
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      filters: [
        { text: 'Facebook Ads', value: 'Facebook Ads', key: 'filter-facebook' },
        { text: 'Google Ads', value: 'Google Ads', key: 'filter-google' },
        { text: 'Website', value: 'Website', key: 'filter-website' },
        { text: 'Referral', value: 'Referral', key: 'filter-referral' },
      ],
      onFilter: (value, record) => record.source === value,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Mới', value: 'new', key: 'filter-new' },
        { text: 'Đã liên hệ', value: 'contacted', key: 'filter-contacted' },
        { text: 'Đủ điều kiện', value: 'qualified', key: 'filter-qualified' },
        { text: 'Đã chuyển đổi', value: 'converted', key: 'filter-converted' },
        { text: 'Thất bại', value: 'lost', key: 'filter-lost' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: Lead['status']) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: 'Điểm AI',
      dataIndex: 'score',
      key: 'score',
      sorter: (a, b) => a.score - b.score,
      render: (score: number) => (
        <span className={score >= 80 ? 'text-green-600 font-semibold' : score >= 60 ? 'text-orange-600' : 'text-red-600'}>
          {score}
        </span>
      ),
    },
    {
      title: 'Người phụ trách',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
    },
    {
      title: 'Liên hệ gần nhất',
      dataIndex: 'lastContactedAt',
      key: 'lastContactedAt',
      sorter: (a, b) => {
        if (!a.lastContactedAt) return 1;
        if (!b.lastContactedAt) return -1;
        return a.lastContactedAt.getTime() - b.lastContactedAt.getTime();
      },
      render: (date?: Date) => date ? date.toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<PhoneOutlined />}
            size="small"
            title="Gọi điện"
          />
          <Button
            type="text"
            icon={<MessageOutlined />}
            size="small"
            title="Nhắn tin"
          />
          <Button
            type="text"
            icon={<UserAddOutlined />}
            size="small"
            title="Chuyển đổi"
            disabled={record.status === 'converted'}
          />
        </Space>
      ),
    },
  ];

  const handleCreateLead = (values: any) => {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: values.name,
      phone: values.phone,
      email: values.email,
      source: values.source,
      status: 'new',
      score: values.score || 50,
      assigned_to: values.assignedTo,
      createdAt: new Date(),
    };
    setLeads([newLead, ...leads]);
    message.success('Tạo lead thành công!');
    setDrawerVisible(false);
    form.resetFields();
  };

  return (
    <div>
      <PageHeader
        title="Quản lý Leads"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads' },
        ]}
        actions={
          <>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)}>
              Thêm Lead
            </Button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            placeholder="Lọc theo trạng thái"
            style={{ width: 180 }}
            allowClear
            options={[
              { label: 'Mới', value: 'new' },
              { label: 'Đã liên hệ', value: 'contacted' },
              { label: 'Đủ điều kiện', value: 'qualified' },
              { label: 'Đã chuyển đổi', value: 'converted' },
              { label: 'Thất bại', value: 'lost' },
            ]}
          />
          <Select
            placeholder="Lọc theo nguồn"
            style={{ width: 180 }}
            allowClear
            options={[
              { label: 'Facebook Ads', value: 'facebook' },
              { label: 'Google Ads', value: 'google' },
              { label: 'Website', value: 'website' },
              { label: 'Referral', value: 'referral' },
            ]}
          />
          <Select
            placeholder="Người phụ trách"
            style={{ width: 180 }}
            allowClear
            options={[
              { label: 'Sale 1', value: 'sale1' },
              { label: 'Sale 2', value: 'sale2' },
              { label: 'Sale 3', value: 'sale3' },
            ]}
          />
          <RangePicker placeholder={['Từ ngày', 'Đến ngày']} />
          <Input.Search placeholder="Tìm kiếm..." style={{ width: 250 }} />
        </div>

        <Table
          columns={columns}
          dataSource={leads}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} leads`,
          }}
        />
      </div>

      {/* Create Lead Drawer */}
      <Drawer
        title="Tạo Lead mới"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateLead}
        >
          <Form.Item
            name="name"
            label="Tên"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input placeholder="Nhập tên lead" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Điện thoại"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input placeholder="0912345678" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="source"
            label="Nguồn"
            rules={[{ required: true, message: 'Vui lòng chọn nguồn' }]}
          >
            <Select
              placeholder="Chọn nguồn lead"
              options={[
                { label: 'Facebook Ads', value: 'Facebook Ads' },
                { label: 'Google Ads', value: 'Google Ads' },
                { label: 'Website', value: 'Website' },
                { label: 'Referral', value: 'Referral' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="assignedTo"
            label="Người phụ trách"
            rules={[{ required: true, message: 'Vui lòng chọn người phụ trách' }]}
          >
            <Select
              placeholder="Chọn người phụ trách"
              options={[
                { label: 'Sale 1', value: 'Sale 1' },
                { label: 'Sale 2', value: 'Sale 2' },
                { label: 'Sale 3', value: 'Sale 3' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="score"
            label="Điểm ban đầu"
            initialValue={50}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Tạo Lead
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
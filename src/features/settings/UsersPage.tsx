import React from 'react';
import { Table, Tag, Button, Space, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import type { User } from '../../shared/types';

const mockUsers: User[] = [
  {
    id: '1',
    full_name: 'Nguyễn Văn A',
    email: 'admin@example.com',
    role_id: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  },
  {
    id: '2',
    full_name: 'Trần Thị B',
    email: 'sale1@example.com',
    role_id: 'sales',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale1',
  },
  {
    id: '3',
    full_name: 'Lê Văn C',
    email: 'teacher1@example.com',
    role_id: 'teacher',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher1',
  },
];

const roleColors = {
  admin: 'red',
  sales: 'blue',
  teacher: 'green',
  manager: 'purple',
};

const roleLabels = {
  admin: 'Admin',
  sales: 'Sales',
  teacher: 'Giảng viên',
  manager: 'Quản lý',
};

export function UsersPage() {
  const columns: ColumnsType<User> = [
    {
      title: 'Tên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (full_name, record) => (
        <div className="flex items-center gap-2">
          <Avatar src={record.avatar} size="small">
            {full_name[0]}
          </Avatar>
          <span>{full_name}</span>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role_id',
      key: 'role_id',
      filters: [
        { text: 'Admin', value: 'admin', key: 'filter-admin' },
        { text: 'Sales', value: 'sales', key: 'filter-sales' },
        { text: 'Giảng viên', value: 'teacher', key: 'filter-teacher' },
        { text: 'Quản lý', value: 'manager', key: 'filter-manager' },
      ],
      onFilter: (value, record) => record.role_id === value,
      render: (role_id: string) => (
        <Tag color={roleColors[role_id as keyof typeof roleColors]}>
          {roleLabels[role_id as keyof typeof roleLabels]}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: () => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}>
            Sửa
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý Người dùng"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Cài đặt' },
          { title: 'Người dùng' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />}>
            Thêm người dùng
          </Button>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Table
          columns={columns}
          dataSource={mockUsers}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} người dùng`,
          }}
        />
      </div>
    </div>
  );
}
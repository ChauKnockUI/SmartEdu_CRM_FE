import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Input, Drawer, Form, message, Modal, Tabs
} from 'antd';
import {
  PlusOutlined,
  PhoneOutlined,
  MessageOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { leadService } from '@/services/api/lead.service';
import { DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '@/shared/contexts/AuthContext';

const { RangePicker } = DatePicker;

const statusColors: any = {
  new: 'blue',
  contacted: 'cyan',
  qualified: 'green',
  converted: 'success',
  lost: 'default',
};

const statusLabels: any = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Đủ điều kiện',
  converted: 'Đã chuyển đổi',
  lost: 'Thất bại',
};

export function LeadsListPage() {
  const navigate = useNavigate();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  console.log('USER:', user);

  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads(1);
  }, []);

  //get list lead
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

  // create lead
  const handleCreateLead = async (values: any) => {
    try {
      await leadService.create(values);

      message.success('Tạo lead thành công');

      setDrawerVisible(false);
      form.resetFields();

      fetchLeads(1);
    } catch (err) {
      console.error(err);
      message.error('Tạo lead thất bại');
    }
  };

  // delete lead
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xóa Lead?',
      content: 'Bạn có chắc muốn xóa lead này không?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',

      onOk: async () => {
        try {
          await leadService.remove(id);

          message.success('Đã xóa lead');

          fetchLeads(pagination.current);
        } catch (err) {
          console.error(err);
          message.error('Xóa thất bại');
        }
      },
    });
  };

  const handleConvert = (lead: any) => {
    Modal.confirm({
      title: 'Chuyển Lead thành học viên?',
      content: `${lead.full_name || lead.name} sẽ trở thành học viên.`,
      okText: 'Chuyển',
      cancelText: 'Hủy',

      onOk: async () => {
        try {
          const res = await leadService.convert(lead.id);

          const password =
            res.temp_password ||
            res.data?.temp_password ||
            res.data?.student?.temp_password;

          Modal.success({
            title: 'Chuyển đổi thành công',
            content: (
              <div>
                <p>Học viên đã được tạo thành công.</p>

                {password ? (
                  <p>
                    Mật khẩu tạm: <b>{password}</b>
                  </p>
                ) : (
                  <p className="text-red-500">
                    Không nhận được mật khẩu từ backend
                  </p>
                )}
              </div>
            ),
          });

          fetchLeads(pagination.current);
        } catch (err: any) {
          message.error(err.message || 'Chuyển đổi thất bại');
        }
      },
    });
  };

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
      render: (name: string, record: any) => (
        <a
          onClick={() => navigate(`/crm/leads/${record.id}`)}
          className="font-medium"
        >
          {name}
        </a>
      ),
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Nguồn',
      dataIndex: 'lead_source',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Điểm AI',
      render: (_: any, record: any) => {
        const score = getScore(record);
        return (
          <span
            className={
              score >= 80
                ? 'text-green-600 font-semibold'
                : score >= 60
                  ? 'text-orange-600'
                  : 'text-red-600'
            }
          >
            {score}
          </span>
        );
      },
    },
    {
      title: 'Người phụ trách',
      render: (_: any, record: any) =>
        record.assignedUser?.full_name || 'Chưa có',
    },
    {
      title: 'Liên hệ gần nhất',
      render: (_: any, record: any) =>
        record.last_contacted
          ? new Date(record.last_contacted).toLocaleDateString('vi-VN')
          : '-',
    },
    {
      title: 'Hành động',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="text" icon={<PhoneOutlined />} size="small" />
          <Button type="text" icon={<MessageOutlined />} size="small" />
          <Button
            type="text"
            icon={<UserAddOutlined />}
            size="small"
            disabled={record.status === 'converted'}
          />
          {user?.role === 'admin' || user?.role === 'sale' ? (
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          ) : null}
          {(record.status === 'enrolled') ? (
            <Button disabled type="link">
              Student
            </Button>
          ) : (
            <Button
              type="link"
              onClick={() => handleConvert(record)}
            >
              Convert
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const convertedColumns = columns.map((col: any) => {
    if (col.key === 'actions') {
      return {
        ...col,
        render: (_: any, record: any) => (
          <Space>
            <Button
              type="link"
              onClick={() => navigate('/lms/students')}
            >
              Student
            </Button>
          </Space>
        ),
      };
    }

    if (col.key === 'status') {
      return {
        ...col,
        render: () => <Tag color="green">Đã chuyển</Tag>,
      };
    }

    return col;
  });

  const pendingLeads = leads.filter(
    (lead) => lead.status !== 'enrolled'
  );

  const convertedLeads = leads.filter(
    (lead) => lead.status === 'enrolled'
  );

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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDrawerVisible(true)}
            >
              Thêm Lead
            </Button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        {/* Filters (UI giữ nguyên) */}
        <div className="mb-4 flex flex-wrap gap-3">
          <Select placeholder="Lọc theo trạng thái" style={{ width: 180 }} allowClear />
          <Select placeholder="Lọc theo nguồn" style={{ width: 180 }} allowClear />
          <Select placeholder="Người phụ trách" style={{ width: 180 }} allowClear />
          <RangePicker />
          <Input.Search placeholder="Tìm kiếm..." style={{ width: 250 }} />
        </div>

        <Tabs
          defaultActiveKey="pending"
          items={[
            {
              key: 'pending',
              label: `Lead chưa chuyển (${pendingLeads.length})`,
              children: (
                <Table
                  columns={columns}
                  dataSource={pendingLeads}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (t) => `Tổng ${t} lead`,
                  }}
                />
              ),
            },
            {
              key: 'converted',
              label: `Đã chuyển thành học viên (${convertedLeads.length})`,
              children: (
                <Table
                  columns={convertedColumns}
                  dataSource={convertedLeads}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                  }}
                />
              ),
            },
          ]}
        />

        <Drawer
          title="Tạo Lead mới"
          width={500}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateLead}
          >
            <Form.Item
              name="full_name"
              label="Tên"
              rules={[{ required: true, message: 'Nhập tên' }]}
            >
              <Input placeholder="Nguyễn Văn A" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ required: true, message: 'Nhập SĐT' }]}
            >
              <Input placeholder="090xxxxxxx" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
            >
              <Input placeholder="email@gmail.com" />
            </Form.Item>

            <Form.Item
              name="source"
              label="Nguồn"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Facebook', value: 'facebook' },
                  { label: 'Google Form', value: 'google form' },
                  { label: 'Website', value: 'website' },
                  { label: 'Referral', value: 'referral' },
                ]}
              />
            </Form.Item>

            <Form.Item name="occupation" label="Nghề nghiệp">
              <Select
                options={[
                  { label: 'Sinh viên năm 1-2', value: 'student_y1_y2' },
                  { label: 'Sinh viên năm 3-4', value: 'student_y3_y4' },
                  { label: 'Người đi làm', value: 'working_professional' },
                ]}
              />
            </Form.Item>

            <Form.Item name="study_purpose" label="Mục tiêu học">
              <Select
                options={[
                  { label: 'Du học', value: 'study_abroad' },
                  { label: 'Công việc', value: 'career' },
                  { label: 'Cải thiện tiếng Anh', value: 'improve' },
                ]}
              />
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
    </div>
  );
}
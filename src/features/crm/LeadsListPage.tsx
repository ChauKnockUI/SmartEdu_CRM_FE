import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Drawer, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, UserAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '@/shared/contexts/AuthContext';
import { leadService } from '@/services/api/lead.service';

const { RangePicker } = DatePicker;

const statusColors: Record<string, string> = {
  new: 'blue',
  contacted: 'cyan',
  interested: 'gold',
  trial: 'purple',
  enrolled: 'green',
  lost: 'red',
};

const statusLabels: Record<string, string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  interested: 'Quan tâm',
  trial: 'Học thử',
  enrolled: 'Đã đăng ký',
  lost: 'Thất bại',
};

const sourceOptions = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Google Form', value: 'google form' },
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
];

export function LeadsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchLeads = async (page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) => {
    try {
      setLoading(true);
      const res = await leadService.getAll({
        page,
        limit: pageSize,
        status: nextFilters.status,
        source: nextFilters.source,
        search: nextFilters.search,
        date_from: nextFilters.dateRange?.[0]?.toISOString(),
        date_to: nextFilters.dateRange?.[1]?.toISOString(),
        sort_by: 'createdAt',
        sort_dir: 'desc',
      });
      setLeads(res.data || []);
      setPagination({
        current: res.pagination?.page || page,
        pageSize: res.pagination?.limit || pageSize,
        total: res.pagination?.total || 0,
      });
    } catch (err: any) {
      message.error(err.message || 'Không tải được danh sách lead');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads(1);
  }, []);

  const handleFilterChange = (patch: any) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    fetchLeads(1, pagination.pageSize, next);
  };

  const handleCreateLead = async (values: any) => {
    try {
      await leadService.create(values);
      message.success('Tạo lead thành công');
      setDrawerVisible(false);
      form.resetFields();
      fetchLeads(1);
    } catch (err: any) {
      message.error(err.message || 'Tạo lead thất bại');
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xóa lead?',
      content: 'Lead và lịch sử tương tác liên quan sẽ bị xóa.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        await leadService.remove(id);
        message.success('Đã xóa lead');
        fetchLeads(pagination.current);
      },
    });
  };

  const handleConvert = (lead: any) => {
    Modal.confirm({
      title: 'Chuyển lead thành học viên?',
      content: `${lead.full_name} sẽ được tạo tài khoản học viên. Lead cần có email hợp lệ.`,
      okText: 'Chuyển',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await leadService.convert(lead.id);
          message.success('Đã chuyển lead thành học viên');
          fetchLeads(pagination.current);
        } catch (err: any) {
          message.error(err.message || 'Chuyển đổi thất bại');
        }
      },
    });
  };

  const columns: ColumnsType<any> = useMemo(() => [
    {
      title: 'Tên lead',
      dataIndex: 'full_name',
      render: (name: string, record: any) => (
        <Button type="link" className="p-0 font-medium" onClick={() => navigate(`/crm/leads/${record.id}`)}>
          {name}
        </Button>
      ),
    },
    { title: 'Điện thoại', dataIndex: 'phone' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Nguồn', dataIndex: 'lead_source', render: (value) => value || '-' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => <Tag color={statusColors[status] || 'default'}>{statusLabels[status] || status}</Tag>,
    },
    {
      title: 'Điểm AI',
      render: (_, record) => {
        const score = Math.round(Number(record.aiScore?.probability_score || 0) * 100);
        return <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>{score}</Tag>;
      },
    },
    { title: 'Phụ trách', render: (_, record) => record.assignedUser?.full_name || 'Chưa phân công' },
    {
      title: 'Liên hệ gần nhất',
      render: (_, record) => record.last_contacted ? dayjs(record.last_contacted).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Hành động',
      width: 190,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" onClick={() => navigate(`/crm/leads/${record.id}`)}>Chi tiết</Button>
          <Button
            type="link"
            icon={<UserAddOutlined />}
            disabled={record.status === 'enrolled'}
            onClick={() => handleConvert(record)}
          >
            Convert
          </Button>
          {user?.role === 'admin' && (
            <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          )}
        </Space>
      ),
    },
  ], [navigate, user?.role, pagination.current]);

  const pendingLeads = leads.filter((lead) => lead.status !== 'enrolled');
  const enrolledLeads = leads.filter((lead) => lead.status === 'enrolled');

  return (
    <div>
      <PageHeader
        title="Quản lý lead"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads' },
        ]}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchLeads()}>Tải lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)}>Thêm lead</Button>
          </Space>
        }
      />

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Space className="mb-4 w-full" size={12} wrap>
          <Select
            placeholder="Trạng thái"
            style={{ width: 180 }}
            allowClear
            value={filters.status}
            onChange={(status) => handleFilterChange({ status })}
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
          />
          <Select
            placeholder="Nguồn"
            style={{ width: 180 }}
            allowClear
            value={filters.source}
            onChange={(source) => handleFilterChange({ source })}
            options={sourceOptions}
          />
          <RangePicker value={filters.dateRange} onChange={(dateRange) => handleFilterChange({ dateRange })} />
          <Input.Search
            allowClear
            placeholder="Tìm theo tên, SĐT, email"
            style={{ width: 260 }}
            onSearch={(search) => handleFilterChange({ search })}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filters.status === 'enrolled' ? enrolledLeads : filters.status ? leads : pendingLeads}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} lead`,
            onChange: (page, pageSize) => fetchLeads(page, pageSize),
          }}
        />
      </div>

      <Drawer title="Tạo lead mới" width={500} onClose={() => setDrawerVisible(false)} open={drawerVisible}>
        <Form form={form} layout="vertical" onFinish={handleCreateLead}>
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
            <Input placeholder="090xxxxxxx" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="email@gmail.com" />
          </Form.Item>
          <Form.Item name="source" label="Nguồn" rules={[{ required: true, message: 'Chọn nguồn lead' }]}>
            <Select options={sourceOptions} />
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
              <Button type="primary" htmlType="submit">Tạo lead</Button>
              <Button onClick={() => setDrawerVisible(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

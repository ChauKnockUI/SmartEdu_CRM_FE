import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Space, Modal, Calendar, Badge, Card,
  Form, Input, Select, message, Popconfirm
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, EditOutlined,
  KeyOutlined, StopOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { teacherService } from '@/services/api/teacher.service';
import { usePermissions } from '../../shared/hooks/usePermissions';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

type Teacher = any;
type TeacherSchedule = any;

const formatTeacherType = (type?: string) => {
  if (type === 'part_time') return 'Bán thời gian';
  return 'Toàn thời gian';
};

const formatTime = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().substring(11, 16);
  return String(value).substring(0, 5);
};

export function TeachersPage() {
  const { can } = usePermissions();
  const canWrite = can('teachers', 'write');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [searchText, statusFilter]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await teacherService.getAll({
        search: searchText || undefined,
        is_active:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active',
      });
      setTeachers(res.data || []);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải danh sách giảng viên');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTeacher(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'full_time',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    form.setFieldsValue({
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone,
      type: teacher.type,
      specialization: teacher.specialization,
      is_active: teacher.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingTeacher) {
        await teacherService.update(editingTeacher.id, values);
        message.success('Cập nhật giảng viên thành công');
      } else {
        const res = await teacherService.create(values);
        message.success('Tạo giảng viên thành công');

        if (res.temp_password) {
          Modal.info({
            title: 'Mật khẩu tạm thời',
            content: (
              <div>
                <div>Email: {values.email}</div>
                <div>Mật khẩu: <b>{res.temp_password}</b></div>
              </div>
            ),
          });
        }
      }

      setModalOpen(false);
      form.resetFields();
      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lưu giảng viên thất bại');
    }
  };

  const handleToggleActive = async (teacher: Teacher) => {
    try {
      if (teacher.is_active) {
        await teacherService.remove(teacher.id);
        message.success('Đã ngưng hoạt động giảng viên');
      } else {
        await teacherService.update(teacher.id, { is_active: true });
        message.success('Đã mở hoạt động giảng viên');
      }

      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const handleResetPassword = async (teacher: Teacher) => {
    try {
      const res = await teacherService.resetPassword(teacher.id);

      Modal.info({
        title: 'Mật khẩu mới',
        content: (
          <div>
            <div>Email: {teacher.email}</div>
            <div>Mật khẩu: <b>{res.new_password}</b></div>
          </div>
        ),
      });
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Khôi phục mật khẩu thất bại');
    }
  };

  const handleViewCalendar = async (teacher: Teacher) => {
    try {
      setSelectedTeacher(teacher);
      setCalendarOpen(true);
      setScheduleLoading(true);

      const start = dayjs().startOf('month').subtract(1, 'month').format('YYYY-MM-DD');
      const end = dayjs().endOf('month').add(2, 'month').format('YYYY-MM-DD');
      const res = await teacherService.getSchedule(teacher.id, {
        start_date: start,
        end_date: end,
      });

      setTeacherSchedules(res.data || []);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải lịch dạy');
    } finally {
      setScheduleLoading(false);
    }
  };

  const getListData = (value: Dayjs) => {
    return teacherSchedules
      .filter(schedule => dayjs(schedule.date).isSame(value, 'day'))
      .map(schedule => ({
        type: schedule.status === 'cancelled' ? 'error' : 'processing',
        content: `${formatTime(schedule.start_time)} - ${schedule.class?.name || 'Lớp học'}${schedule.room?.name ? ` (${schedule.room.name})` : ''}`,
      }));
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);

    return (
      <ul className="events">
        {listData.map((item, index) => (
          <li key={index}>
            <Badge status={item.type as any} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  const columns: ColumnsType<Teacher> = [
    {
      title: 'Tên giảng viên',
      dataIndex: 'full_name',
      sorter: (a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')),
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      render: (type) => <Tag color="blue">{formatTeacherType(type)}</Tag>,
    },
    {
      title: 'Chuyên môn',
      dataIndex: 'specialization',
      render: (specialization) => specialization || '-',
    },
    {
      title: 'Lớp',
      render: (_, record) => record._count?.classes ?? 0,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      render: (_, teacher) => (
        <Space size="small">
          <Button icon={<CalendarOutlined />} onClick={() => handleViewCalendar(teacher)} />

          {canWrite && (
            <Button icon={<EditOutlined />} onClick={() => openEditModal(teacher)} />
          )}

          {canWrite && (
            <Popconfirm
              title="Khôi phục mật khẩu?"
              onConfirm={() => handleResetPassword(teacher)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button icon={<KeyOutlined />} />
            </Popconfirm>
          )}

          {canWrite && (
            <Popconfirm
              title={teacher.is_active ? 'Ngưng hoạt động giảng viên?' : 'Mở hoạt động giảng viên?'}
              onConfirm={() => handleToggleActive(teacher)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button
                danger={teacher.is_active}
                icon={teacher.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý Giảng viên"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Giảng viên' },
        ]}
        actions={
          canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Thêm giảng viên
            </Button>
          )
        }
      />

      <Card>
        <div className="mb-4 flex gap-4">
          <Input.Search
            placeholder="Tìm tên, email, điện thoại..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            style={{ width: 320 }}
          />

          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}>
            <Select.Option value="active">Đang hoạt động</Select.Option>
            <Select.Option value="inactive">Ngưng hoạt động</Select.Option>
            <Select.Option value="all">Tất cả</Select.Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={teachers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} giảng viên`,
          }}
        />
      </Card>

      <Modal
        title={editingTeacher ? 'Cập nhật giảng viên' : 'Thêm giảng viên'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="full_name" label="Tên giảng viên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="Điện thoại">
            <Input />
          </Form.Item>

          <Form.Item name="type" label="Loại giảng viên" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="full_time">Toàn thời gian</Select.Option>
              <Select.Option value="part_time">Bán thời gian</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="specialization" label="Chuyên môn">
            <Input placeholder="IELTS, TOEIC, giao tiếp..." />
          </Form.Item>

          <Form.Item name="is_active" label="Trạng thái" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={true}>Đang hoạt động</Select.Option>
              <Select.Option value={false}>Ngưng hoạt động</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Lịch dạy của ${selectedTeacher?.full_name || ''}`}
        open={calendarOpen}
        onCancel={() => setCalendarOpen(false)}
        footer={null}
        width="80%"
      >
        <Card loading={scheduleLoading}>
          <Calendar dateCellRender={dateCellRender} />
        </Card>
      </Modal>
    </div>
  );
}

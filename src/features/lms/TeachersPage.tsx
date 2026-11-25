import { useListLocation } from '../../shared/hooks/useListLocation';
import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useRef, useState } from 'react';
import {
  Table, Tag, Button, Space, Modal, Card,
  Form, Input, Select, message, Popconfirm, Alert
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, EditOutlined,
  KeyOutlined, StopOutlined, CheckCircleOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { teacherService } from '@/services/api/teacher.service';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useSearchInput } from '../../shared/hooks/useSearchInput';
import { clearListCache } from '../../services/api/listCache';
import { confirmDiscardChanges, formSnapshot } from '../../shared/utils/formChanges';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// ✅ Dùng UTC để tránh lệch ngày do timezone
dayjs.extend(utc);

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
  const { user } = useAuth();
  const identity = `${user?.id}:${user?.role}`;
  const latestIdentity = useRef(identity); latestIdentity.current = identity;
  const listRequest = useRef(0);
  const [dataOwner, setDataOwner] = useState('');
  const [loadError, setLoadError] = useState('');
  const { params, page, pageSize, setPage, choice, update } = useListLocation({ status: 'active' });
  const [total, setTotal] = useState(0);
  const pagination = { page, limit: pageSize, total };
  const canWrite = can('teachers', 'write');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const searchText = (params.get('search') || '').slice(0, 200);
  const statusFilter = choice('status', ['active', 'inactive', 'all']);
  const { searchDraft, setSearchDraft, submitSearch } = useSearchInput(searchText, search => {
    update({ search }, true, true);
  });

  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const original = useRef('');
  const saveBusy = useRef(false), alive = useRef(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const closeModal = () => {
    if (!saveBusy.current) confirmDiscardChanges(formSnapshot(form.getFieldsValue(true)) !== original.current, () => {
      if (alive.current && identity === latestIdentity.current && !saveBusy.current) setModalOpen(false);
    });
  };

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
    return () => { listRequest.current++; };
  }, [searchText, statusFilter, pagination.page, pagination.limit, identity]);

  const fetchTeachers = async () => {
    const request = ++listRequest.current;
    try {
      setLoading(true);
      setLoadError('');
      const res = await teacherService.getAll({
        page: pagination.page, limit: pagination.limit,
        search: searchText || undefined,
        is_active:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active',
      });
      if (request !== listRequest.current || identity !== latestIdentity.current) return;
      const total = res.pagination?.total || 0;
      const lastPage = Math.max(1, Math.ceil(total / pagination.limit));
      if (pagination.page > lastPage) { setPage(lastPage); return; }
      setTeachers(res.data || []); setDataOwner(identity);
      setTotal(total);
    } catch (err: any) {
      if (request !== listRequest.current || identity !== latestIdentity.current) return;
      setTeachers([]); setDataOwner(identity); setTotal(0);
      setLoadError(err.message || 'Không thể tải danh sách giảng viên');
    } finally {
      if (request === listRequest.current && identity === latestIdentity.current) setLoading(false);
    }
  };

  const refresh = () => { clearListCache(); fetchTeachers(); };

  const openCreateModal = () => {
    if (saveBusy.current) return;
    setEditingTeacher(null);
    form.resetFields();
    form.setFieldsValue({ type: 'full_time', is_active: true });
    original.current = formSnapshot(form.getFieldsValue(true));
    setModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    if (saveBusy.current) return;
    setEditingTeacher(teacher);
    form.resetFields();
    form.setFieldsValue({
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone,
      type: teacher.type,
      specialization: teacher.specialization,
      is_active: teacher.is_active,
    });
    original.current = formSnapshot(form.getFieldsValue(true));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (saveBusy.current || !canWrite) return;
    saveBusy.current = true; setSaving(true);
    try {
      let values;
      try { values = await form.validateFields(); } catch { return; }
      if (!alive.current || identity !== latestIdentity.current) return;

      if (editingTeacher) {
        await teacherService.update(editingTeacher.id, values);
        if (!alive.current || identity !== latestIdentity.current) return;
        message.success('Cập nhật giảng viên thành công');
      } else {
        const res = await teacherService.create(values);
        if (!alive.current || identity !== latestIdentity.current) return;
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
      if (alive.current && identity === latestIdentity.current) message.error(err.message || 'Lưu giảng viên thất bại');
    } finally {
      saveBusy.current = false;
      if (alive.current) setSaving(false);
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

  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(dayjs());

  const getScheduleDate = (schedule: TeacherSchedule) =>
    dayjs.utc(schedule.date).format('YYYY-MM-DD');

  const getSchedulesForDate = (dateStr: string) =>
    teacherSchedules.filter(s => getScheduleDate(s) === dateStr);

  const buildCalendarDays = (month: Dayjs) => {
    const startOfMonth = month.startOf('month');
    const startDow = startOfMonth.day();
    const offset = startDow === 0 ? 6 : startDow - 1;
    const start = startOfMonth.subtract(offset, 'day');
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  };

  const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const GCalendar = () => {
    const days = buildCalendarDays(calendarCurrentMonth);
    const today = dayjs().format('YYYY-MM-DD');

    return (
      <div className="select-none">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setCalendarCurrentMonth(m => m.subtract(1, 'month'))}
            className="px-3 py-1 rounded border hover:bg-gray-100 text-sm"
          >&#8249;</button>
          <span className="text-base font-semibold w-40 text-center">
            {calendarCurrentMonth.format('MMMM YYYY')}
          </span>
          <button
            onClick={() => setCalendarCurrentMonth(m => m.add(1, 'month'))}
            className="px-3 py-1 rounded border hover:bg-gray-100 text-sm"
          >&#8250;</button>
          <button
            onClick={() => setCalendarCurrentMonth(dayjs())}
            className="ml-2 px-3 py-1 rounded border hover:bg-gray-100 text-sm text-blue-600"
          >Hôm nay</button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DOW_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden">
          {days.map((day, i) => {
            const dateStr = day.format('YYYY-MM-DD');
            const isToday = dateStr === today;
            const isCurrentMonth = day.month() === calendarCurrentMonth.month();
            const schedules = getSchedulesForDate(dateStr);
            const cellCls = ['border-b border-r min-h-[100px] p-1.5', !isCurrentMonth ? 'bg-gray-50/60' : 'bg-white'].join(' ');
            const dayCls = ['text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium transition-colors', isToday ? 'bg-blue-600 text-white font-bold' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'].join(' ');

            return (
              <div key={i} className={cellCls}>
                <div className="flex justify-center mb-1">
                  <span className={dayCls}>{day.date()}</span>
                </div>

                {schedules.map((s, idx) => {
                  const cancelled = s.status === 'cancelled';
                  const chipCls = ['text-xs rounded-md px-1.5 py-0.5 mb-0.5 truncate cursor-default leading-5', cancelled ? 'bg-red-50 text-red-500 line-through border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'].join(' ');
                  const tip = (s.class?.name || '') + ' | ' + formatTime(s.start_time) + ' - ' + formatTime(s.end_time) + (s.room?.name ? ' | ' + s.room.name : '');
                  return (
                    <div key={idx} title={tip} className={chipCls}>
                      <span className="font-semibold">{formatTime(s.start_time)}</span>
                      {' '}{s.class?.name || 'Lớp học'}
                      {s.room?.name ? ' · ' + s.room.name : ''}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
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
    <div className="crm-page">
      <PageHeader
        title="Quản lý Giảng viên"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Giảng viên' },
        ]}
        actions={
          <><Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>Tải lại</Button>{canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Thêm giảng viên
            </Button>
          )}</>
        }
      />

      <Card>
        <div className="crm-filter-controls mb-4">
          <Input.Search
            placeholder="Tìm tên, email, điện thoại..."
            aria-label="Tìm giảng viên" value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)} onSearch={submitSearch}
            allowClear
            className="crm-filter-search"
          />

          <Select aria-label="Trạng thái giảng viên" value={statusFilter} className="crm-filter-status" onChange={value => {
            update({ status: value });
          }}>
            <Select.Option value="active">Đang hoạt động</Select.Option>
            <Select.Option value="inactive">Ngưng hoạt động</Select.Option>
            <Select.Option value="all">Tất cả</Select.Option>
          </Select>
        </div>

        {loadError && <Alert className="mb-4" type="error" showIcon message={loadError}
          action={<Button onClick={refresh}>Thử lại</Button>} />}
        <Table
          columns={columns}
          dataSource={dataOwner === identity ? teachers : []}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1050 }}
          pagination={paginationProps('giảng viên', { current: pagination.page, pageSize: pagination.limit,
            total: dataOwner === identity ? pagination.total : 0,
            onChange: (page, limit) => setPage(limit === pageSize ? page : 1, limit) })}
        />
      </Card>

      <Modal
        title={editingTeacher ? 'Cập nhật giảng viên' : 'Thêm giảng viên'}
        open={modalOpen && canWrite} forceRender
        onOk={handleSave}
        onCancel={closeModal}
        confirmLoading={saving} closable={!saving} maskClosable={!saving} keyboard={!saving}
        cancelButtonProps={{ disabled: saving }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" disabled={saving}>
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
        onCancel={() => {
          setCalendarOpen(false);
          setCalendarCurrentMonth(dayjs());
        }}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <Card loading={scheduleLoading} styles={{ body: { padding: '12px' } }}>
          <GCalendar />
        </Card>
      </Modal>
    </div>
  );
}

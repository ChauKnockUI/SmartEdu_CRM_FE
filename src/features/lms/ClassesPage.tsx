import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  InputNumber,
  Empty,
  Spin,
  Alert,
  Pagination,
  Space,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/components/PageHeader';
import { useSearchParams } from 'react-router';
import { classService, type ClassFilterOptions } from '@/services/api/class.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { CLASS_STATUSES, getClassStatus, classPageSizes, readClassLocation, writeClassLocation, classQueryParams, type ClassListView } from './classFilters';
import { courseSchedulePreview } from './courseSchedule';

type Class = any;

const dayMap: Record<string, string> = {
  '0': 'CN',
  '1': 'Thứ 2',
  '2': 'Thứ 3',
  '3': 'Thứ 4',
  '4': 'Thứ 5',
  '5': 'Thứ 6',
  '6': 'Thứ 7',
};

const formatTimeValue = (value?: string | Date | null) => {
  if (!value) return '';

  const text = String(value);

  const isoMatch = text.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];

  if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5);

  return text;
};

export function ClassesPage() {
  const { openDetail } = useDetailNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(() => readClassLocation(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = useState(view.search);
  const { user } = useAuth();
  const role = user?.role;

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [total, setTotal] = useState(0);
  const listRequest = useRef(0);
  const optionsRequest = useRef(0);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [options, setOptions] = useState<ClassFilterOptions>({ courses: [], teachers: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [creating, setCreating] = useState(false);
  const createBusy = useRef(false);
  const courses = options.courses;
  const createCourses = courses.filter(course => course.is_active !== false);
  const selectedCourseId = Form.useWatch('course_id', form);
  const startDate = Form.useWatch('start_date', form);
  const scheduleDays = Form.useWatch('schedule_days', form);
  const selectedCourse = createCourses.find(course => course.id === selectedCourseId);
  const totalSessions = selectedCourse?.total_sessions;
  const autoEnd = totalSessions != null;
  const startDay = startDate?.format('YYYY-MM-DD') || '';
  const schedulePreview = useMemo(() => autoEnd && scheduleDays?.length
    ? courseSchedulePreview(startDay, scheduleDays, totalSessions!) : null,
    [startDay, scheduleDays, totalSessions, autoEnd]);
  const hasFilters = !!(view.search || view.status || view.courseId || view.teacherId || view.unassignedTeacher);
  const updateView = (patch: Partial<ClassListView>, resetPage = true) =>
    setSearchParams(writeClassLocation({ ...view, ...patch, ...(resetPage ? { page: 1 } : {}) }));

  const fetchClasses = async () => {
    const request = ++listRequest.current;
    let changingPage = false;
    try {
      setLoading(true);
      setLoadError('');
      const res = await classService.getAll(classQueryParams(view));
      if (request !== listRequest.current) return;
      const count = res.pagination?.total || 0;
      const lastPage = Math.max(1, Math.ceil(count / view.pageSize));
      if (view.page > lastPage) {
        changingPage = true;
        setSearchParams(writeClassLocation({ ...view, page: lastPage }), { replace: true });
        return;
      }
      setClasses(res.data || []);
      setTotal(count);
    } catch (err: any) {
      if (request === listRequest.current) {
        setClasses([]); setTotal(0);
        setLoadError(err.message || 'Không tải được danh sách lớp học');
      }
    } finally {
      if (request === listRequest.current && !changingPage) setLoading(false);
    }
  };

  const fetchOptions = async () => {
    const request = ++optionsRequest.current;
    setOptionsLoading(true); setOptionsError('');
    try {
      const res = await classService.getFilterOptions();
      if (request === optionsRequest.current) setOptions(res.data);
    } catch (err: any) {
      if (request === optionsRequest.current) setOptionsError(err.message || 'Không tải được bộ lọc lớp học');
    } finally {
      if (request === optionsRequest.current) setOptionsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    return () => { listRequest.current++; };
  }, [searchParams, user?.id, role]);
  useEffect(() => {
    setOptions({ courses: [], teachers: [] }); fetchOptions();
    return () => { optionsRequest.current++; };
  }, [user?.id, role]);
  useEffect(() => { setSearchDraft(view.search); }, [view.search]);
  useEffect(() => {
    if (open && autoEnd) form.setFieldValue('end_date', schedulePreview ? dayjs(schedulePreview.endDate) : undefined);
  }, [open, autoEnd, schedulePreview, form]);
  useEffect(() => {
    if (!isAdmin || searchParams.get('create') !== '1' || optionsLoading || optionsError || !courses.length) return;
    const course = createCourses.find(item => item.id === view.courseId);
    if (course) {
      form.resetFields(); form.setFieldsValue({ course_id: course.id }); setOpen(true);
    } else message.warning('Khóa học đã tạm dừng hoặc không còn tồn tại. Vui lòng chọn khóa học đang mở.');
    const next = new URLSearchParams(searchParams); next.delete('create'); setSearchParams(next, { replace: true });
  }, [searchParams, optionsLoading, optionsError, courses, isAdmin]);

  const parseDbField = <T,>(val: any): T[] => {
    if (Array.isArray(val)) return val;

    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch { }
    }

    return [];
  };

  const renderDays = (cls: Class) => {
    if (!cls.schedule_days) return 'Chưa có lịch';

    const daysArr = parseDbField<number>(cls.schedule_days);

    if (daysArr.length === 0) return 'Chưa có lịch';

    return daysArr
      .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
      .map((d) => dayMap[String(d)] ?? '?')
      .join(' • ');
  };

  const renderTime = (cls: Class) => {
    if (!cls.schedule_time) return '';

    const timeArr = parseDbField<string>(cls.schedule_time);

    if (timeArr.length === 2) {
      return `${formatTimeValue(timeArr[0])} – ${formatTimeValue(timeArr[1])}`;
    }

    return String(cls.schedule_time);
  };

  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format('DD/MM/YYYY') : '–';

  const handleCreate = async () => {
    if (createBusy.current) return;
    createBusy.current = true; setCreating(true);
    try {
      const v = await form.validateFields();
      await classService.create({
        name: v.name,
        course_id: v.course_id,
        start_date: v.start_date.format('YYYY-MM-DD') + 'T00:00:00.000Z',
        end_date: (schedulePreview?.endDate || v.end_date.format('YYYY-MM-DD')) + 'T00:00:00.000Z',
        schedule_days: v.schedule_days as number[],
        schedule_time: [
          v.schedule_time[0].format('HH:mm'),
          v.schedule_time[1].format('HH:mm'),
        ],
        max_students: v.max_students,
      });

      message.success(hasFilters ? 'Tạo lớp thành công. Danh sách vẫn áp dụng bộ lọc đã chọn.' : 'Tạo lớp thành công');
      setOpen(false);
      form.resetFields();
      fetchOptions();
      if (view.page !== 1) updateView({ page: 1 }, false);
      else fetchClasses();
    } catch (err: any) {
      if (!err.errorFields) { message.error(err.message || 'Tạo thất bại'); fetchOptions(); }
    } finally {
      createBusy.current = false; setCreating(false);
    }
  };

  const pageTitle = isAdmin
    ? 'Quản lý Lớp học'
    : isTeacher
      ? 'Lớp phụ trách'
      : isStudent
        ? 'Lớp của tôi'
        : 'Lớp có học viên phụ trách';

  const courseOptions = courses.map(item => ({ value: item.id, label: item.name }));
  if (view.courseId && !courses.some(item => item.id === view.courseId)) courseOptions.push({
    value: view.courseId, label: 'Khóa học đang chọn',
  });
  const teacherOptions: { value: number | string; label: string }[] = [
    ...(!isTeacher || view.unassignedTeacher ? [{ value: 'unassigned', label: 'Chưa phân công giáo viên' }] : []),
    ...options.teachers.map(item => ({ value: item.id, label: item.full_name })),
  ];
  if (view.teacherId && !options.teachers.some(item => item.id === view.teacherId)) teacherOptions.push({
    value: view.teacherId, label: 'Giáo viên đang chọn',
  });

  return (
    <div>
      <PageHeader
        title={pageTitle}
        actions={<Space wrap>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { fetchClasses(); fetchOptions(); }}>Tải lại</Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={optionsLoading || !!optionsError || !createCourses.length}
              onClick={() => { form.resetFields(); form.setFieldsValue({
                course_id: createCourses.some(course => course.id === view.courseId) ? view.courseId : undefined,
              }); setOpen(true); }}
            >
              Tạo lớp học
            </Button>
          )}
        </Space>}
      />

      <Card className="mb-4" size="small">
        <Space wrap size={[12, 12]}>
          <Input.Search aria-label="Tìm theo tên lớp" placeholder="Tìm theo tên lớp" allowClear maxLength={200}
            value={searchDraft} style={{ width: 260 }} onChange={event => setSearchDraft(event.target.value)}
            onSearch={value => updateView({ search: value.trim() })} />
          <Select aria-label="Lọc theo khóa học" placeholder="Khóa học" allowClear showSearch optionFilterProp="label"
            style={{ width: 220 }} value={view.courseId} options={courseOptions} loading={optionsLoading}
            onChange={courseId => updateView({ courseId })} />
          <Select aria-label="Lọc theo trạng thái lớp" placeholder="Trạng thái lớp" allowClear style={{ width: 180 }}
            value={view.status} options={CLASS_STATUSES.map(({ value, label }) => ({ value, label }))}
            onChange={status => updateView({ status })} />
          <Select aria-label="Lọc theo giáo viên" placeholder="Giáo viên phụ trách" allowClear showSearch optionFilterProp="label"
            style={{ width: 250 }} value={view.unassignedTeacher ? 'unassigned' : view.teacherId}
            options={teacherOptions} loading={optionsLoading}
            onChange={value => updateView({ teacherId: typeof value === 'number' ? value : undefined, unassignedTeacher: value === 'unassigned' })} />
          {hasFilters && <Button type="link" onClick={() => {
            setSearchDraft(''); setSearchParams(writeClassLocation({ ...readClassLocation(new URLSearchParams()), pageSize: view.pageSize }));
          }}>Xóa bộ lọc</Button>}
        </Space>
        {!loadError && <div className="mt-3 text-sm text-gray-500">{loading ? 'Đang tải lớp học...' : `Tổng ${total} lớp${hasFilters ? ' phù hợp bộ lọc' : ''}`}</div>}
      </Card>

      {optionsError && <Alert className="mb-4" type="warning" showIcon message={optionsError}
        action={<Button onClick={fetchOptions}>Thử lại bộ lọc</Button>} />}

      {loadError ? <Alert type="error" showIcon message={loadError} action={<Button onClick={fetchClasses}>Thử lại</Button>} /> : loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <Empty
            description={
              hasFilters ? 'Không có lớp phù hợp bộ lọc đã chọn' : isTeacher
                ? 'Bạn chưa được gán lớp dạy nào'
                : isStudent
                  ? 'Bạn chưa được ghi danh vào lớp nào'
                  : 'Chưa có lớp học trong phạm vi phụ trách'
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {classes.map((cls) => (
            <Col xs={24} md={12} lg={8} key={cls.id}>
              <Card
                hoverable
                loading={loading}
                onClick={() => openDetail(`/lms/classes/${cls.id}`)}
                title={
                  <div className="flex justify-between gap-2">
                    <span className="min-w-0 break-words font-semibold">{cls.name}</span>
                    <Tag className="shrink-0 self-start" color={getClassStatus(cls.status).color}>
                      {getClassStatus(cls.status).label}
                    </Tag>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <BookOutlined className="mr-2" />
                    {cls.course?.name || 'Chưa gắn khóa học'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <UserOutlined className="mr-2" />
                    {cls.teacher?.full_name ||
                      cls.teacher?.name ||
                      cls.teacherName ||
                      'Chưa phân công giáo viên'}
                  </div>

                  <div className="flex items-center text-gray-600">
                    <TeamOutlined className="mr-2" />
                    {cls._count?.classEnrollments ?? 0}{cls.max_students > 0 ? `/${cls.max_students}` : ''}{' '}
                    học viên
                  </div>

                  <div className="flex items-center text-gray-600">
                    <CalendarOutlined className="mr-2" />
                    <span>{renderDays(cls)}</span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🕐</span>
                    <span>{renderTime(cls) || 'Chưa có giờ'}</span>
                  </div>

                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <CalendarOutlined className="mr-1" />
                    {formatDate(cls.start_date)}
                    <span className="mx-1">→</span>
                    {formatDate(cls.end_date)}
                  </div>

                  <Button
                    type="link"
                    className="px-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(`/lms/classes/${cls.id}`);
                    }}
                  >
                    Chi tiết lớp
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {!loadError && !loading && total > 0 && <Pagination className="mt-5" current={view.page} pageSize={view.pageSize}
        total={total} showSizeChanger pageSizeOptions={classPageSizes} showTotal={count => `Tổng ${count} lớp`}
        onChange={(page, pageSize) => updateView({ page: pageSize === view.pageSize ? page : 1, pageSize }, false)} />}

      <Modal
        title="Tạo lớp học"
        open={open}
        onOk={handleCreate}
        confirmLoading={creating}
        okButtonProps={{ disabled: optionsLoading || (autoEnd && !schedulePreview) }}
        cancelButtonProps={{ disabled: creating }} closable={!creating} maskClosable={!creating} keyboard={!creating}
        onCancel={() => { if (!createBusy.current) setOpen(false); }}
      >
        <Form form={form} disabled={creating} layout="vertical">
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="course_id"
            label="Khóa học"
            rules={[{ required: true }, { validator: (_, value) => !value || createCourses.some(course => course.id === value)
              ? Promise.resolve() : Promise.reject(new Error('Chọn khóa học đang mở.')) }]}
          >
            <Select
              showSearch optionFilterProp="label"
              options={createCourses.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </Form.Item>

          {selectedCourse && <Typography.Paragraph type="secondary">
            {autoEnd ? `Khóa học gồm ${totalSessions} buổi. Ngày kết thúc được tính theo các thứ học đã chọn.`
              : 'Khóa học chưa có số buổi. Nhập ngày kết thúc để tạo lịch như hiện tại.'}
          </Typography.Paragraph>}

          <Form.Item
            name="start_date"
            label="Ngày bắt đầu"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="schedule_days"
            label="Thứ học"
            rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất một thứ học trong tuần.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn các ngày học"
              options={[
                { label: 'Thứ 2', value: 1 },
                { label: 'Thứ 3', value: 2 },
                { label: 'Thứ 4', value: 3 },
                { label: 'Thứ 5', value: 4 },
                { label: 'Thứ 6', value: 5 },
                { label: 'Thứ 7', value: 6 },
                { label: 'Chủ nhật', value: 0 },
              ]}
            />
          </Form.Item>
          <Typography.Paragraph type="secondary">Số buổi mỗi tuần: {scheduleDays?.length || 0}</Typography.Paragraph>

          <Form.Item name="end_date" label={autoEnd ? 'Ngày kết thúc dự kiến (tự tính)' : 'Ngày kết thúc'} rules={[{ required: true }]}>
            <DatePicker className="w-full" disabled={autoEnd} format="DD/MM/YYYY" />
          </Form.Item>
          {schedulePreview && <Alert className="mb-4" type="info" showIcon
            message={`${totalSessions} buổi · ${scheduleDays.length} buổi/tuần · Buổi đầu ${dayjs(schedulePreview.firstDate).format('DD/MM/YYYY')} · Buổi cuối ${dayjs(schedulePreview.endDate).format('DD/MM/YYYY')}`}
            description="Tính theo lịch học hằng tuần, chưa trừ ngày nghỉ lễ." />}

          <Form.Item
            name="schedule_time"
            label="Giờ học"
            rules={[{ required: true }]}
          >
            <TimePicker.RangePicker className="w-full" format="HH:mm" />
          </Form.Item>

          <Form.Item name="max_students" label="Sĩ số">
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

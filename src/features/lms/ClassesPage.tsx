import { paginationProps } from '../../shared/utils/pagination';
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
  Alert,
  Empty,
  Spin,
  Pagination,
  Space,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/components/PageHeader';
import { useSearchParams } from 'react-router';
import { classService, type ClassFilterOptions } from '@/services/api/class.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { useSearchInput } from '../../shared/hooks/useSearchInput';
import { clearListCache } from '../../services/api/listCache';
import { confirmDiscardChanges, formSnapshot } from '../../shared/utils/formChanges';
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
  const { searchDraft, setSearchDraft, submitSearch } = useSearchInput(view.search, search => updateView({ search }));
  const { user } = useAuth();
  const role = user?.role;
  const identity = `${user?.id}:${role}`;
  const [dataOwner, setDataOwner] = useState('');
  const latestIdentity = useRef(identity); latestIdentity.current = identity;

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
  const original = useRef('');
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const snapshot = () => {
    const values = form.getFieldsValue(true);
    return formSnapshot({ ...values, start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
      schedule_time: values.schedule_time?.map((time: dayjs.Dayjs | null) => time?.format('HH:mm')) }, ['schedule_days']);
  };
  const [options, setOptions] = useState<ClassFilterOptions>({ courses: [], teachers: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [creating, setCreating] = useState(false);
  const createBusy = useRef(false);
  const closeModal = () => {
    if (!createBusy.current) confirmDiscardChanges(snapshot() !== original.current, () => {
      if (alive.current && identity === latestIdentity.current && !createBusy.current) setOpen(false);
    });
  };
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
      if (request !== listRequest.current || identity !== latestIdentity.current) return;
      const count = res.pagination?.total || 0;
      const lastPage = Math.max(1, Math.ceil(count / view.pageSize));
      if (view.page > lastPage) {
        changingPage = true;
        setSearchParams(writeClassLocation({ ...view, page: lastPage }), { replace: true });
        return;
      }
      setClasses(res.data || []);
      setTotal(count);
      setDataOwner(identity);
    } catch (err: any) {
      if (request === listRequest.current && identity === latestIdentity.current) {
        setClasses([]); setTotal(0);
        setDataOwner(identity);
        setLoadError(err.message || 'Không tải được danh sách lớp học');
      }
    } finally {
      if (request === listRequest.current && identity === latestIdentity.current && !changingPage) setLoading(false);
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
  useEffect(() => {
    if (open && autoEnd) form.setFieldValue('end_date', schedulePreview ? dayjs(schedulePreview.endDate) : undefined);
  }, [open, autoEnd, schedulePreview, form]);
  useEffect(() => {
    if (!isAdmin || searchParams.get('create') !== '1' || optionsLoading || optionsError || !courses.length) return;
    const course = createCourses.find(item => item.id === view.courseId);
    if (course) {
      form.resetFields(); form.setFieldsValue({ course_id: course.id });
      original.current = snapshot(); setOpen(true);
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
    if (!isAdmin || createBusy.current) return;
    createBusy.current = true; setCreating(true);
    try {
      const v = await form.validateFields();
      if (!alive.current || identity !== latestIdentity.current) return;
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

      if (!alive.current || identity !== latestIdentity.current) return;
      message.success(hasFilters ? 'Tạo lớp thành công. Danh sách vẫn áp dụng bộ lọc đã chọn.' : 'Tạo lớp thành công');
      setOpen(false);
      form.resetFields();
      fetchOptions();
      if (view.page !== 1) updateView({ page: 1 }, false);
      else fetchClasses();
    } catch (err: any) {
      if (alive.current && identity === latestIdentity.current && !err.errorFields) { message.error(err.message || 'Tạo thất bại'); fetchOptions(); }
    } finally {
      createBusy.current = false; if (alive.current) setCreating(false);
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
    <div className="crm-page">
      <PageHeader
        title={pageTitle}
        actions={<Space wrap>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { clearListCache(); fetchClasses(); fetchOptions(); }}>Tải lại</Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={optionsLoading || !!optionsError || !createCourses.length}
              onClick={() => { if (createBusy.current) return; form.resetFields(); form.setFieldsValue({
                course_id: createCourses.some(course => course.id === view.courseId) ? view.courseId : undefined,
              }); original.current = snapshot(); setOpen(true); }}
            >
              Tạo lớp học
            </Button>
          )}
        </Space>}
      />

      <Card>
        <Space wrap size={[12, 12]} className="crm-filter-controls mb-4">
          <Input.Search aria-label="Tìm theo tên lớp" placeholder="Tìm theo tên lớp" allowClear maxLength={200}
            value={searchDraft} className="crm-filter-search" onChange={event => setSearchDraft(event.target.value)}
            onSearch={submitSearch} />
          <Select aria-label="Lọc theo khóa học" placeholder="Khóa học" allowClear showSearch optionFilterProp="label"
            className="crm-filter-select" value={view.courseId} options={courseOptions} loading={optionsLoading}
            onChange={courseId => updateView({ courseId })} />
          <Select aria-label="Lọc theo trạng thái lớp" placeholder="Trạng thái lớp" allowClear className="crm-filter-status"
            value={view.status} options={CLASS_STATUSES.map(({ value, label }) => ({ value, label }))}
            onChange={status => updateView({ status })} />
          <Select aria-label="Lọc theo giáo viên" placeholder="Giáo viên phụ trách" allowClear showSearch optionFilterProp="label"
            className="crm-filter-select" value={view.unassignedTeacher ? 'unassigned' : view.teacherId}
            options={teacherOptions} loading={optionsLoading}
            onChange={value => updateView({ teacherId: typeof value === 'number' ? value : undefined, unassignedTeacher: value === 'unassigned' })} />
          {hasFilters && <Button type="link" onClick={() => {
            setSearchDraft(''); setSearchParams(writeClassLocation({ ...readClassLocation(new URLSearchParams()), pageSize: view.pageSize }));
          }}>Xóa bộ lọc</Button>}
        </Space>

        {optionsError && <Alert className="mb-4" type="warning" showIcon message={optionsError}
          action={<Button onClick={fetchOptions}>Thử lại bộ lọc</Button>} />}
        {loadError && <Alert className="mb-4" type="error" showIcon message={loadError}
          action={<Button onClick={fetchClasses}>Thử lại</Button>} />}

        {!loadError && <>
          <Spin spinning={loading}>
            {dataOwner === identity && classes.length ? <Row className="crm-class-grid" gutter={[16, 16]}>
              {classes.map(cls => {
                const status = getClassStatus(cls.status);
                return <Col xs={24} md={12} xl={8} key={cls.id}>
                  <article className="crm-class-card" aria-label={`Lớp ${cls.name}`}>
                    <div className="crm-class-heading">
                      <div className="min-w-0">
                        <Button type="link" className="crm-class-title"
                          onClick={() => openDetail(`/lms/classes/${cls.id}`)}>{cls.name}</Button>
                        <div className="crm-class-secondary">{cls.course?.name || 'Chưa gắn khóa học'}</div>
                      </div>
                      <Tag color={status.color}>{status.label}</Tag>
                    </div>
                    <div>
                      <div className="font-medium">{renderDays(cls)} · {renderTime(cls) || 'Chưa có giờ'}</div>
                      <div className="crm-class-secondary">{formatDate(cls.start_date)} – {formatDate(cls.end_date)}</div>
                    </div>
                    <div className="text-sm"><span className="text-gray-500">Giáo viên: </span>
                      {cls.teacher?.full_name || cls.teacher?.name || cls.teacherName || 'Chưa phân công'}</div>
                    <div className="crm-class-footer">
                      <span className="text-sm">Sĩ số <strong>{cls._count?.classEnrollments ?? 0}{cls.max_students > 0 ? `/${cls.max_students}` : ''}</strong></span>
                      <Button type="link" size="small" onClick={() => openDetail(`/lms/classes/${cls.id}`)}>Chi tiết</Button>
                    </div>
                  </article>
                </Col>;
              })}
            </Row> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loading ? 'Đang tải lớp học...' : hasFilters ? 'Không có lớp phù hợp bộ lọc đã chọn'
              : isTeacher ? 'Bạn chưa được gán lớp dạy nào' : isStudent ? 'Bạn chưa được ghi danh vào lớp nào'
                : 'Chưa có lớp học trong phạm vi phụ trách'} />}
          </Spin>
          <Pagination {...paginationProps('lớp', {
            current: view.page, pageSize: view.pageSize, total: dataOwner === identity ? total : 0, pageSizeOptions: classPageSizes, disabled: loading,
            onChange: (page, pageSize) => updateView({ page: pageSize === view.pageSize ? page : 1, pageSize }, false),
          })} />
        </>}
      </Card>

      <Modal
        title="Tạo lớp học"
        open={isAdmin && open} forceRender={isAdmin}
        onOk={handleCreate}
        confirmLoading={creating}
        okButtonProps={{ disabled: optionsLoading || (autoEnd && !schedulePreview) }}
        cancelButtonProps={{ disabled: creating }} closable={!creating} maskClosable={!creating} keyboard={!creating}
        onCancel={closeModal} okText="Lưu" cancelText="Hủy"
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

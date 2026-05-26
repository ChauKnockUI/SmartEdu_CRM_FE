import { useEffect, useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { classService } from '@/services/api/class.service';
import { courseService } from '@/services/api/course.service';
import { useAuth } from '../../shared/contexts/AuthContext';

type Class = any;

const statusColors: any = {
  upcoming: 'blue',
  ongoing: 'green',
  completed: 'default',
  cancelled: 'red',
  active: 'green',
};

const statusLabels: any = {
  upcoming: 'Sắp khai giảng',
  ongoing: 'Đang học',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
  active: 'Đang học',
};

const dayMap: Record<string, string> = {
  '0': 'CN',
  '1': 'Thứ 2',
  '2': 'Thứ 3',
  '3': 'Thứ 4',
  '4': 'Thứ 5',
  '5': 'Thứ 6',
  '6': 'Thứ 7',
};

const getArrayData = (res: any) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.classes)) return res.classes;
  return [];
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [courses, setCourses] = useState<any[]>([]);

  const fetchClasses = async () => {
    try {
      setLoading(true);

      const res = isAdmin
        ? await classService.getAll()
        : await classService.getMyClasses();

      setClasses(getArrayData(res));
    } catch (err: any) {
      message.error(err.message || 'Lỗi tải lớp học');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await courseService.getAll();
      setCourses(getArrayData(res));
    } catch {
      setCourses([]);
    }
  };

  useEffect(() => {
    fetchClasses();

    if (isAdmin) {
      fetchCourses();
    }
  }, [role]);

  const parseDbField = <T,>(val: any): T[] => {
    if (Array.isArray(val)) return val;

    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {}
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
    try {
      const v = await form.validateFields();

      await classService.create({
        name: v.name,
        course_id: v.course_id,
        start_date: v.start_date.format('YYYY-MM-DD') + 'T00:00:00.000Z',
        end_date: v.end_date.format('YYYY-MM-DD') + 'T00:00:00.000Z',
        schedule_days: v.schedule_days as number[],
        schedule_time: [
          v.schedule_time[0].format('HH:mm'),
          v.schedule_time[1].format('HH:mm'),
        ],
        max_students: v.max_students,
      });

      message.success('Tạo lớp thành công');
      setOpen(false);
      form.resetFields();
      fetchClasses();
    } catch (err: any) {
      message.error(err.message || 'Tạo thất bại');
    }
  };

  const pageTitle = isAdmin
    ? 'Quản lý Lớp học'
    : isTeacher
      ? 'Lớp đang dạy'
      : isStudent
        ? 'Lớp đang học'
        : 'Lớp học';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        actions={
          isAdmin ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
            >
              Tạo lớp học
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <Empty
            description={
              isTeacher
                ? 'Bạn chưa được gán lớp dạy nào'
                : isStudent
                  ? 'Bạn chưa được ghi danh vào lớp nào'
                  : 'Chưa có lớp học'
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
                onClick={() => navigate(`/lms/classes/${cls.id}`)}
                title={
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{cls.name}</span>
                    <Tag color={statusColors[cls.status] || 'blue'}>
                      {statusLabels[cls.status] || cls.status || 'Đang học'}
                    </Tag>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <UserOutlined className="mr-2" />
                    {cls.teacher?.full_name ||
                      cls.teacher?.name ||
                      cls.teacherName ||
                      'Chưa gán'}
                  </div>

                  <div className="flex items-center text-gray-600">
                    <TeamOutlined className="mr-2" />
                    {cls._count?.classEnrollments ||
                      cls.classEnrollments?.length ||
                      cls.enrollments?.length ||
                      0}{' '}
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
                      navigate(`/lms/classes/${cls.id}`);
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

      <Modal
        title="Tạo lớp học"
        open={open}
        onOk={handleCreate}
        onCancel={() => setOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="course_id"
            label="Khóa học"
            rules={[{ required: true }]}
          >
            <Select
              options={courses.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Ngày bắt đầu"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="end_date"
            label="Ngày kết thúc"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="schedule_days"
            label="Thứ học"
            rules={[{ required: true }]}
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
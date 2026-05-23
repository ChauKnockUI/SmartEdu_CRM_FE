import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space,
  message, Modal, Form, Input, DatePicker, TimePicker, Select, InputNumber
} from 'antd';
import {
  PlusOutlined, TeamOutlined,
  CalendarOutlined, UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { classService } from '@/services/api/class.service';
import { courseService } from '@/services/api/course.service';

type Class = any;

const statusColors: any = {
  upcoming: 'blue',
  ongoing: 'green',
  completed: 'default',
  cancelled: 'red',
};

const statusLabels: any = {
  upcoming: 'Sắp khai giảng',
  ongoing: 'Đang học',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
};

// Backend dùng JS Date.getDay(): 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
const dayMap: Record<string, string> = {
  '0': 'CN',
  '1': 'Thứ 2',
  '2': 'Thứ 3',
  '3': 'Thứ 4',
  '4': 'Thứ 5',
  '5': 'Thứ 6',
  '6': 'Thứ 7',
};

export function ClassesPage() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [courses, setCourses] = useState<any[]>([]);

  // ================= FETCH =================
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await classService.getAll();
      setClasses(res.data || []);
    } catch {
      message.error('Lỗi tải lớp học');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    const res = await courseService.getAll();
    setCourses(res.data || []);
  };

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, []);

  // ================= FORMAT =================
  const parseDbField = <T,>(val: any): T[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch {}
    }
    return [];
  };

  const renderDays = (cls: Class) => {
    if (!cls.schedule_days) return 'Chưa có lịch';
    const daysArr = parseDbField<number>(cls.schedule_days);
    return daysArr
      .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)) // sắp xếp T2→CN
      .map((d) => dayMap[String(d)] ?? '?')
      .join(' • ');
  };

  const renderTime = (cls: Class) => {
    if (!cls.schedule_time) return '';
    const timeArr = parseDbField<string>(cls.schedule_time);
    return timeArr.length === 2 ? `${timeArr[0]} – ${timeArr[1]}` : String(cls.schedule_time);
  };

  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format('DD/MM/YYYY') : '–';

  // ================= CREATE =================
  const handleCreate = async () => {
    try {
      const v = await form.validateFields();

      await classService.create({
        name: v.name,
        course_id: v.course_id,
        // Gửi UTC midnight đúng ngày — tránh lệch timezone UTC+7
        start_date: v.start_date.format('YYYY-MM-DD') + 'T00:00:00.000Z',
        end_date: v.end_date.format('YYYY-MM-DD') + 'T00:00:00.000Z',
        // BE nhận number[] → generateScheduleDates dùng Date.getDay() (0=CN,1=T2...)
        schedule_days: v.schedule_days as number[],
        // BE nhận string[] rồi tự JSON.stringify khi lưu
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

  return (
    <div>
      <PageHeader
        title="Quản lý Lớp học"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Tạo lớp học
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        {classes.map(cls => (
          <Col xs={24} md={12} lg={8} key={cls.id}>
            <Card
              hoverable
              loading={loading}
              onClick={() => navigate(`/lms/classes/${cls.id}`)}
              title={
                <div className="flex justify-between">
                  <span className="font-semibold">{cls.name}</span>
                  <Tag color={statusColors[cls.status]}>
                    {statusLabels[cls.status]}
                  </Tag>
                </div>
              }
            >
              <div className="space-y-3">

                {/* Teacher */}
                <div className="flex items-center text-gray-600">
                  <UserOutlined className="mr-2" />
                  {cls.teacher?.full_name || 'Chưa gán'}
                </div>

                {/* Students */}
                <div className="flex items-center text-gray-600">
                  <TeamOutlined className="mr-2" />
                  {cls._count?.classEnrollments || 0} học viên
                </div>

                {/* Schedule days */}
                <div className="flex items-center text-gray-600">
                  <CalendarOutlined className="mr-2" />
                  <span>{renderDays(cls)}</span>
                </div>

                {/* Schedule time */}
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">🕐</span>
                  <span>{renderTime(cls) || 'Chưa có giờ'}</span>
                </div>

                {/* Date range */}
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <CalendarOutlined className="mr-1" />
                  {formatDate(cls.start_date)}
                  <span className="mx-1">→</span>
                  {formatDate(cls.end_date)}
                </div>

              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ================= CREATE MODAL ================= */}
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

          <Form.Item name="course_id" label="Khóa học" rules={[{ required: true }]}>
            <Select options={courses.map(c => ({
              label: c.name,
              value: c.id
            }))} />
          </Form.Item>

          <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="end_date" label="Ngày kết thúc" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="schedule_days" label="Thứ học" rules={[{ required: true }]}>
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
            <TimePicker.RangePicker
              className="w-full"
              format="HH:mm"
            />
          </Form.Item>

          <Form.Item name="max_students" label="Sĩ số">
            <InputNumber className="w-full" />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}
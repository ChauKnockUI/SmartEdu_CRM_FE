import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space,
  message, Modal, Form, Input, DatePicker, Select, InputNumber
} from 'antd';
import {
  PlusOutlined, TeamOutlined,
  CalendarOutlined, UserOutlined
} from '@ant-design/icons';
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

const dayMap: any = {
  Mon: 'Thứ 2',
  Tue: 'Thứ 3',
  Wed: 'Thứ 4',
  Thu: 'Thứ 5',
  Fri: 'Thứ 6',
  Sat: 'Thứ 7',
  Sun: 'CN',
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
  const renderSchedule = (cls: Class) => {
    if (!cls.schedule_days) return 'Chưa có lịch';

    const days = cls.schedule_days
      .split(',')
      .map((d: string) => dayMap[d] || d)
      .join(', ');

    return `${days} (${cls.schedule_time})`;
  };

  // ================= CREATE =================
  const handleCreate = async () => {
    try {
      const v = await form.validateFields();

      await classService.create({
        name: v.name,
        course_id: v.course_id,
        start_date: v.start_date.format('YYYY-MM-DD'),
        end_date: v.end_date.format('YYYY-MM-DD'),
        schedule_days: v.schedule_days.join(','), // 🔥
        schedule_time: v.schedule_time,
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

                {/* Schedule */}
                <div className="flex items-center text-gray-600">
                  <CalendarOutlined className="mr-2" />
                  {renderSchedule(cls)}
                </div>

                {/* Start date */}
                <div className="text-sm text-gray-500">
                  Khai giảng:{' '}
                  {cls.start_date
                    ? new Date(cls.start_date).toLocaleDateString('vi-VN')
                    : '-'}
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
              options={[
                { label: 'T2', value: 'Mon' },
                { label: 'T3', value: 'Tue' },
                { label: 'T4', value: 'Wed' },
                { label: 'T5', value: 'Thu' },
                { label: 'T6', value: 'Fri' },
                { label: 'T7', value: 'Sat' },
                { label: 'CN', value: 'Sun' },
              ]}
            />
          </Form.Item>

          <Form.Item name="schedule_time" label="Giờ học" rules={[{ required: true }]}>
            <Input placeholder="VD: 18:00 - 20:00" />
          </Form.Item>

          <Form.Item name="max_students" label="Sĩ số">
            <InputNumber className="w-full" />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}
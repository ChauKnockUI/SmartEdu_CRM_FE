import { useEffect, useState } from 'react';
import {
  Card, Form, Select, Button, Space,
  Table, Tag, Alert, message, Divider
} from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { classService } from '@/services/api/class.service';
import { getApiConfig } from '@/services/api/apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

type Class = any;
type Room = any;
type Teacher = any;

export function SchedulingPage() {
  const [form] = Form.useForm();

  const [classes, setClasses] = useState<Class[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);

  // ================= FETCH CLASSES =================
  const fetchClasses = async () => {
    try {
      const res = await classService.getAll();
      setClasses(res.data || []);
    } catch {
      message.error('Lỗi tải lớp');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // ================= HELPER =================
  const dayMapReverse: any = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };

  const convertDays = (days: string) => {
    return days?.split(',').map((d: string) => dayMapReverse[d]).join(',');
  };

  const convertTime = (time: string) => {
    return time?.replace(' - ', ',');
  };

  const formatSchedule = (cls: Class) => {
    return `${cls.schedule_days} (${cls.schedule_time})`;
  };

  // ================= LOAD AVAILABLE =================
  const loadAvailable = async (cls: Class) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        start_date: cls.start_date,
        end_date: cls.end_date,
        schedule_days: convertDays(cls.schedule_days),
        schedule_time: convertTime(cls.schedule_time),
      });

      const [roomRes, teacherRes] = await Promise.all([
        fetch(`${config.baseURL}/rooms/available?${params}`, {
          headers: getAuthHeader(),
        }),
        fetch(`${config.baseURL}/teachers/available?${params}`, {
          headers: getAuthHeader(),
        }),
      ]);

      const roomJson = await roomRes.json();
      const teacherJson = await teacherRes.json();

      setRooms(roomJson.data || []);
      setTeachers(teacherJson.data || []);

    } catch (err) {
      console.error(err);
      message.error('Không thể load phòng / giáo viên');
    } finally {
      setLoading(false);
    }
  };

  // ================= SELECT CLASS =================
  const handleClassChange = (classId: number) => {
    const cls = classes.find(c => c.id === classId);
    setSelectedClass(cls || null);

    if (cls) {
      loadAvailable(cls);
    }
  };

  // ================= ASSIGN =================
  const handleAssign = async () => {
    try {
      const values = await form.validateFields();

      await classService.update(values.classId, {
        room_id: values.room_id,
        teacher_id: values.teacher_id,
      });

      message.success('Xếp lớp thành công');

      form.resetFields();
      setSelectedClass(null);
      setRooms([]);
      setTeachers([]);

    } catch {
      message.error('Xếp lớp thất bại');
    }
  };

  return (
    <div>
      <PageHeader
        title="Xếp lớp"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Xếp lớp' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= FORM ================= */}
        <Card title="Xếp lớp">

          <Form form={form} layout="vertical">

            {/* CLASS */}
            <Form.Item
              name="classId"
              label="Chọn lớp"
              rules={[{ required: true }]}
            >
              <Select
                placeholder="Chọn lớp"
                onChange={handleClassChange}
                options={classes.map(c => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </Form.Item>

            {/* ROOM */}
            <Form.Item name="room_id" label="Chọn phòng">
              <Select
                loading={loading}
                placeholder="Chọn phòng"
                options={rooms.map(r => ({
                  label: r.is_available
                    ? `${r.name} (${r.capacity})`
                    : `${r.name} (Đang bận)`,
                  value: r.id,
                  disabled: !r.is_available,
                }))}
              />
            </Form.Item>

            {/* TEACHER */}
            <Form.Item name="teacher_id" label="Chọn giảng viên">
              <Select
                loading={loading}
                placeholder="Chọn giáo viên"
                options={teachers.map(t => ({
                  label: t.is_available
                    ? t.full_name
                    : `${t.full_name} (Đang bận)`,
                  value: t.id,
                  disabled: !t.is_available,
                }))}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAssign}
                >
                  Xếp lớp
                </Button>

                <Button
                  onClick={() => {
                    form.resetFields();
                    setSelectedClass(null);
                  }}
                >
                  Hủy
                </Button>
              </Space>
            </Form.Item>

          </Form>
        </Card>

        {/* ================= PREVIEW ================= */}
        <Card title="Thông tin lớp">

          {selectedClass ? (
            <>
              <Alert
                type="info"
                showIcon
                message="Thông tin lớp"
                description={
                  <div>
                    <div><b>Lớp:</b> {selectedClass.name}</div>
                    <div><b>Lịch:</b> {formatSchedule(selectedClass)}</div>
                    <div><b>Thời gian:</b> {new Date(selectedClass.start_date).toLocaleDateString('vi-VN')} - {new Date(selectedClass.end_date).toLocaleDateString('vi-VN')}</div>
                  </div>
                }
              />

              <Divider />

              {/* ROOM TABLE */}
              <h4>Phòng rảnh</h4>
              <Table
                dataSource={rooms}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Tên phòng', dataIndex: 'name' },
                  { title: 'Sức chứa', dataIndex: 'capacity' },
                ]}
              />

              <Divider />

              {/* TEACHER TABLE */}
              <h4>Giảng viên rảnh</h4>
              <Table
                dataSource={teachers}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Tên', dataIndex: 'full_name' },
                  {
                    title: 'Trạng thái',
                    render: () => <Tag color="green">Rảnh</Tag>,
                  },
                ]}
              />
            </>
          ) : (
            <div className="text-gray-400 text-center py-10">
              Chọn lớp để xem thông tin
            </div>
          )}

        </Card>

      </div>

      <Divider />

      {/* ================= FUTURE: STUDENT ================= */}
      <Card
        title="(Tương lai) Xếp học viên"
        extra={<Button icon={<CalendarOutlined />}>Sắp làm</Button>}
      >
        <div className="text-gray-400 text-center py-6">
          Sau này bạn có thể add student vào đây
        </div>
      </Card>

    </div>
  );
}
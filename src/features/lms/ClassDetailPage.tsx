import { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Button,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select, Table, Space, Alert, TimePicker
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams } from 'react-router';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import dayjs from 'dayjs';

type Class = any;

// BE dùng JS Date.getDay(): 0=CN, 1=T2 ... 6=T7
// Lưu DB: JSON.stringify([1,3,5]) → "[1,3,5]"
const DAY_OPTIONS = [
  { label: 'Thứ 2', value: 1 },
  { label: 'Thứ 3', value: 2 },
  { label: 'Thứ 4', value: 3 },
  { label: 'Thứ 5', value: 4 },
  { label: 'Thứ 6', value: 5 },
  { label: 'Thứ 7', value: 6 },
  { label: 'Chủ nhật', value: 0 },
];

const DAY_MAP: Record<string, string> = {
  '0': 'Chủ nhật',
  '1': 'Thứ 2',
  '2': 'Thứ 3',
  '3': 'Thứ 4',
  '4': 'Thứ 5',
  '5': 'Thứ 6',
  '6': 'Thứ 7',
};

// BE JSON.stringify khi lưu → cần parse khi đọc
const parseDbField = <T,>(val: any): T[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch {}
  }
  return [];
};

const formatDays = (raw?: any) => {
  if (!raw) return 'N/A';
  const arr = parseDbField<number>(raw);
  return arr
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => DAY_MAP[String(d)] ?? '?')
    .join(' • ');
};

const formatTime = (raw?: any) => {
  if (!raw) return 'N/A';
  const arr = parseDbField<string>(raw);
  return arr.length === 2 ? `${arr[0]} – ${arr[1]}` : String(raw);
};

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return dayjs(date).format('DD/MM/YYYY');
};

export function ClassDetailPage() {
  const { id } = useParams();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  // ================= FETCH =================
  const fetchClass = async () => {
    try {
      setLoading(true);
      const res = await classService.getById(Number(id));
      setClassItem(res.data);
    } catch {
      message.error('Lỗi tải lớp học');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll({ page: 1, limit: 100 });
      setStudents(res.data || []);
    } catch {
      message.error('Không tải được danh sách học viên');
    }
  };

  useEffect(() => {
    fetchClass();
    fetchStudents();
  }, [id]);

  if (!classItem) return <div>Không tìm thấy lớp</div>;

  // ================= EDIT =================
  const handleEdit = () => {
    // Parse JSON string từ DB → set vào form
    const daysArr = parseDbField<number>(classItem.schedule_days);
    const timeArr = parseDbField<string>(classItem.schedule_time);

    form.setFieldsValue({
      name: classItem.name,
      max_students: classItem.max_students,
      schedule_days: daysArr,
      // TimePicker.RangePicker cần dayjs object
      schedule_time: timeArr.length === 2
        ? [dayjs(timeArr[0], 'HH:mm'), dayjs(timeArr[1], 'HH:mm')]
        : undefined,
    });

    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      await classService.update(classItem.id, {
        name: values.name,
        max_students: values.max_students,
        // Gửi đúng format BE: number[]
        schedule_days: values.schedule_days as number[],
        // Gửi đúng format BE: string[]
        schedule_time: values.schedule_time
          ? [
              values.schedule_time[0].format('HH:mm'),
              values.schedule_time[1].format('HH:mm'),
            ]
          : undefined,
      });

      message.success('Cập nhật thành công');
      setEditModalOpen(false);
      fetchClass();
    } catch (err: any) {
      message.error(err.message || 'Lỗi cập nhật');
    }
  };

  // ================= STATUS =================
  const getStatusTag = (status: string) => {
    const map: any = {
      upcoming: { color: 'blue', label: 'Sắp mở' },
      ongoing: { color: 'green', label: 'Đang học' },
      completed: { color: 'default', label: 'Hoàn thành' },
      cancelled: { color: 'red', label: 'Đã huỷ' },
    };
    const s = map[status] || map.upcoming;
    return <Tag color={s.color}>{s.label}</Tag>;
  };

  // ================= ENROLL =================
  const handleEnroll = async () => {
    if (!selectedStudentIds.length) {
      message.warning('Chọn ít nhất 1 học viên');
      return;
    }

    try {
      setEnrollLoading(true);
      const res = await classService.enrollStudents(classItem.id, selectedStudentIds);

      const failed = res.data.failed || [];
      const successful = res.data.successful || [];

      if (failed.length === 0) {
        message.success('Ghi danh thành công tất cả học viên');
      } else {
        Modal.info({
          title: 'Kết quả ghi danh',
          width: 700,
          content: (
            <div>
              <Alert
                type="success"
                message={`Thành công: ${successful.length} học viên`}
                className="mb-4"
              />
              <Table
                size="small"
                pagination={false}
                rowKey="student_id"
                dataSource={failed}
                columns={[
                  { title: 'Student ID', dataIndex: 'student_id' },
                  { title: 'Lý do', dataIndex: 'reason' },
                ]}
              />
            </div>
          ),
        });
      }

      setEnrollModalOpen(false);
      setSelectedStudentIds([]);
      fetchClass();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={classItem.name}
        actions={
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            Chỉnh sửa
          </Button>
        }
      />

      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <Card loading={loading}>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Tên lớp">
                    {classItem.name}
                  </Descriptions.Item>

                  <Descriptions.Item label="Trạng thái">
                    {getStatusTag(classItem.status)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Khóa học">
                    {classItem.course?.name}
                  </Descriptions.Item>

                  <Descriptions.Item label="Giảng viên">
                    {classItem.teacher?.full_name || 'Chưa phân công'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Phòng học">
                    {classItem.room?.name || 'N/A'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Sĩ số">
                    {classItem._count?.classEnrollments || 0} / {classItem.max_students}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày học">
                    <span className="font-medium">{formatDays(classItem.schedule_days)}</span>
                  </Descriptions.Item>

                  <Descriptions.Item label="Giờ học">
                    <span className="font-medium">{formatTime(classItem.schedule_time)}</span>
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày bắt đầu">
                    {formatDate(classItem.start_date)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày kết thúc">
                    {formatDate(classItem.end_date)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày tạo">
                    {formatDate(classItem.createdAt)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Cập nhật">
                    {formatDate(classItem.updatedAt)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'students',
            label: 'Học viên',
            children: (
              <Card
                extra={
                  <Button type="primary" onClick={() => setEnrollModalOpen(true)}>
                    Thêm học viên
                  </Button>
                }
              >
                <p className="mb-4 text-gray-600">
                  Sĩ số: <strong>{classItem._count?.classEnrollments || 0}</strong> / {classItem.max_students}
                </p>

                <Table
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  dataSource={classItem.classEnrollments || []}
                  locale={{ emptyText: 'Chưa có học viên nào trong lớp' }}
                  columns={[
                    {
                      title: '#',
                      width: 50,
                      render: (_: any, __: any, index: number) => index + 1,
                    },
                    {
                      title: 'Họ tên',
                      render: (row: any) => row.student?.full_name || `ID: ${row.student_id}`,
                    },
                    {
                      title: 'Email',
                      render: (row: any) => row.student?.email || '—',
                    },
                    {
                      title: 'Số điện thoại',
                      render: (row: any) => row.student?.phone || '—',
                    },
                    {
                      title: 'Trạng thái',
                      render: (row: any) => {
                        const colorMap: Record<string, string> = {
                          active: 'green',
                          inactive: 'default',
                          dropped: 'red',
                        };
                        return (
                          <Tag color={colorMap[row.status] ?? 'default'}>
                            {row.status === 'active' ? 'Đang học'
                              : row.status === 'dropped' ? 'Đã nghỉ'
                              : row.status}
                          </Tag>
                        );
                      },
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* ================= MODAL EDIT ================= */}
      <Modal
        title="Chỉnh sửa lớp học"
        open={editModalOpen}
        onOk={handleUpdate}
        onCancel={() => setEditModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="max_students" label="Sĩ số">
            <InputNumber className="w-full" />
          </Form.Item>

          <Form.Item name="schedule_days" label="Ngày học">
            <Select
              mode="multiple"
              placeholder="Chọn các ngày học"
              options={DAY_OPTIONS}
            />
          </Form.Item>

          <Form.Item name="schedule_time" label="Giờ học">
            <TimePicker.RangePicker className="w-full" format="HH:mm" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ================= MODAL ENROLL ================= */}
      <Modal
        title="Thêm học viên vào lớp"
        open={enrollModalOpen}
        onCancel={() => setEnrollModalOpen(false)}
        onOk={handleEnroll}
        confirmLoading={enrollLoading}
        width={700}
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Chọn học viên"
          value={selectedStudentIds}
          onChange={setSelectedStudentIds}
          optionFilterProp="label"
          showSearch
          options={students.map((s) => ({
            value: s.id,
            label: `${s.full_name} (${s.email})`,
          }))}
        />
      </Modal>
    </div>
  );
}
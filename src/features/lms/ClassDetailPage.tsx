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
  Select
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams } from 'react-router';
import { classService } from '@/services/api/class.service';

type Class = any;

export function ClassDetailPage() {
  const { id } = useParams();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  // ================= FORMAT =================
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const dayMap: Record<string, string> = {
    Mon: 'Thứ 2',
    Tue: 'Thứ 3',
    Wed: 'Thứ 4',
    Thu: 'Thứ 5',
    Fri: 'Thứ 6',
    Sat: 'Thứ 7',
    Sun: 'Chủ nhật',
  };

  const formatDays = (days?: string) => {
    if (!days) return 'N/A';

    return days
      .split(',')
      .map(d => dayMap[d.trim()] || d)
      .join(', ');
  };

  const formatTime = (time?: string) => time || '';

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

  useEffect(() => {
    fetchClass();
  }, [id]);

  if (!classItem) return <div>Không tìm thấy lớp</div>;

  // ================= EDIT =================
  const handleEdit = () => {
    form.setFieldsValue({
      name: classItem.name,
      max_students: classItem.max_students,
      schedule_days: classItem.schedule_days?.split(','),
      schedule_time: classItem.schedule_time,
    });

    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        ...values,
        schedule_days: values.schedule_days.join(','), // 🔥 convert lại cho BE
      };

      await classService.update(classItem.id, payload);

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
                    {classItem.teacher?.name || 'Chưa phân công'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Phòng học">
                    {classItem.room?.name}
                  </Descriptions.Item>

                  <Descriptions.Item label="Sĩ số">
                    {classItem._count?.classEnrollments || 0} / {classItem.max_students}
                  </Descriptions.Item>

                  <Descriptions.Item label="Lịch học">
                    <div className="font-medium">
                      {formatDays(classItem.schedule_days)}
                    </div>
                    <div className="text-gray-500">
                      {formatTime(classItem.schedule_time)}
                    </div>
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

          <Form.Item name="schedule_days" label="Lịch học">
            <Select
              mode="multiple"
              options={[
                { label: 'Thứ 2', value: 'Mon' },
                { label: 'Thứ 3', value: 'Tue' },
                { label: 'Thứ 4', value: 'Wed' },
                { label: 'Thứ 5', value: 'Thu' },
                { label: 'Thứ 6', value: 'Fri' },
                { label: 'Thứ 7', value: 'Sat' },
                { label: 'CN', value: 'Sun' },
              ]}
            />
          </Form.Item>

          <Form.Item name="schedule_time" label="Thời gian">
            <Input placeholder="18:00 - 20:00" />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}
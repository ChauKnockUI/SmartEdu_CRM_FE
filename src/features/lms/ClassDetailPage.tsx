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
  Select,
  Table,
  Space,
  Alert,
  TimePicker,
  Upload,
} from 'antd';
import {
  EditOutlined,
  CalendarOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useNavigate } from 'react-router';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import { scheduleService } from '@/services/api/schedule.service';
import { materialService } from '@/services/api/material.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import dayjs from 'dayjs';

type Class = any;

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

const parseDbField = <T,>(val: any): T[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch { }
  }
  return [];
};

const formatDays = (raw?: any) => {
  if (!raw) return 'N/A';
  const arr = parseDbField<number>(raw);

  return arr
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAY_MAP[String(d)] ?? '?')
    .join(' • ');
};

const formatTime = (raw?: any) => {
  if (!raw) return 'N/A';

  const text = String(raw);
  const isoMatch = text.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];

  const arr = parseDbField<string>(raw);
  return arr.length === 2 ? `${arr[0]} – ${arr[1]}` : String(raw);
};

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return dayjs(date).format('DD/MM/YYYY');
};

export function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [classItem, setClassItem] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const canUploadMaterial = isAdmin || isTeacher;
  const canEditClass = isAdmin || isTeacher;

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

  const fetchSchedules = async () => {
    try {
      const res = await scheduleService.getByClass(Number(id));
      setSchedules(res.data || []);
    } catch {
      setSchedules([]);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await materialService.getByClass(Number(id));
      setMaterials(res.data || []);
    } catch {
      setMaterials([]);
    }
  };

  useEffect(() => {
    fetchClass();
    fetchStudents();
    fetchSchedules();
    fetchMaterials();
  }, [id]);

  if (!classItem) return <div>Không tìm thấy lớp</div>;

  const handleEdit = () => {
    const daysArr = parseDbField<number>(classItem.schedule_days);
    const timeArr = parseDbField<string>(classItem.schedule_time);

    form.setFieldsValue({
      name: classItem.name,
      max_students: classItem.max_students,
      schedule_days: daysArr,
      schedule_time:
        timeArr.length === 2
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
        schedule_days: values.schedule_days as number[],
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

  const handleUploadMaterial = async () => {
    try {
      const values = await uploadForm.validateFields();

      if (!uploadFile) {
        message.warning('Vui lòng chọn file');
        return;
      }

      await materialService.upload(classItem.id, {
        title: values.title,
        file: uploadFile,
      });

      message.success('Tải tài liệu thành công');
      setUploadModalOpen(false);
      uploadForm.resetFields();
      setUploadFile(null);
      fetchMaterials();
    } catch (err: any) {
      message.error(err.message || 'Tải tài liệu thất bại');
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    try {
      await materialService.remove(materialId);
      message.success('Đã xóa tài liệu');
      fetchMaterials();
    } catch (err: any) {
      message.error(err.message || 'Xóa tài liệu thất bại');
    }
  };

  return (
    <div>
      <PageHeader
        title={classItem.name}
        actions={
          canEditClass ? (
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              Chỉnh sửa
            </Button>
          ) : null
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
                  <Descriptions.Item label="Tên lớp">{classItem.name}</Descriptions.Item>

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
                    <span className="font-medium">
                      {formatDays(classItem.schedule_days)}
                    </span>
                  </Descriptions.Item>

                  <Descriptions.Item label="Giờ học">
                    <span className="font-medium">
                      {formatTime(classItem.schedule_time)}
                    </span>
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày bắt đầu">
                    {formatDate(classItem.start_date)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày kết thúc">
                    {formatDate(classItem.end_date)}
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
                  isAdmin ? (
                    <Button type="primary" onClick={() => setEnrollModalOpen(true)}>
                      Thêm học viên
                    </Button>
                  ) : null
                }
              >
                <p className="mb-4 text-gray-600">
                  Sĩ số: <strong>{classItem._count?.classEnrollments || 0}</strong> /{' '}
                  {classItem.max_students}
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
                      render: (row: any) =>
                        row.student?.full_name || `ID: ${row.student_id}`,
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
                            {row.status === 'active'
                              ? 'Đang học'
                              : row.status === 'dropped'
                                ? 'Đã nghỉ'
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
          {
            key: 'sessions',
            label: 'Buổi học',
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={schedules}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Chưa có buổi học nào' }}
                  columns={[
                    {
                      title: 'Ngày học',
                      dataIndex: 'date',
                      render: (date: string) => (
                        <Space>
                          <CalendarOutlined />
                          {formatDate(date)}
                        </Space>
                      ),
                    },
                    {
                      title: 'Thời gian',
                      render: (row: any) =>
                        `${formatTime(row.start_time || row.startTime)} - ${formatTime(
                          row.end_time || row.endTime
                        )}`,
                    },
                    {
                      title: 'Phòng',
                      render: (row: any) => row.room?.name || row.room_name || '—',
                    },
                    {
                      title: 'Trạng thái',
                      render: (row: any) =>
                        row.attendances?.length > 0 ? (
                          <Tag color="green">Đã điểm danh</Tag>
                        ) : (
                          <Tag color="blue">Chưa điểm danh</Tag>
                        ),
                    },
                    {
                      title: 'Thao tác',
                      render: (row: any) => (
                        <Space>
                          {isTeacher && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckCircleOutlined />}
                              onClick={() => navigate(`/lms/sessions/${row.id}`)}
                            >
                              Điểm danh
                            </Button>
                          )}

                          <Button
                            size="small"
                            onClick={() => navigate(`/lms/sessions/${row.id}`)}
                          >
                            Chi tiết
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'materials',
            label: 'Tài liệu',
            children: (
              <Card
                extra={
                  canUploadMaterial ? (
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={() => setUploadModalOpen(true)}
                    >
                      Tải tài liệu lên
                    </Button>
                  ) : null
                }
              >
                <Table
                  rowKey="id"
                  dataSource={materials}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Chưa có tài liệu nào' }}
                  columns={[
                    {
                      title: 'Tên tài liệu',
                      dataIndex: 'title',
                      render: (title: string) => (
                        <Space>
                          <FileOutlined />
                          {title}
                        </Space>
                      ),
                    },
                    {
                      title: 'Tên file',
                      dataIndex: 'file_name',
                      render: (fileName: string) => fileName || '—',
                    },
                    {
                      title: 'Ngày tải lên',
                      dataIndex: 'created_at',
                      render: (date: string) => formatDate(date),
                    },
                    {
                      title: 'Thao tác',
                      render: (row: any) => (
                        <Space>
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => window.open(row.file_url, '_blank')}
                          >
                            Tải xuống
                          </Button>

                          {canUploadMaterial && (
                            <Button
                              danger
                              size="small"
                              onClick={() => handleDeleteMaterial(row.id)}
                            >
                              Xóa
                            </Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

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
            <Select mode="multiple" placeholder="Chọn các ngày học" options={DAY_OPTIONS} />
          </Form.Item>

          <Form.Item name="schedule_time" label="Giờ học">
            <TimePicker.RangePicker className="w-full" format="HH:mm" />
          </Form.Item>
        </Form>
      </Modal>

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

      <Modal
        title="Tải tài liệu lên"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false);
          setUploadFile(null);
          uploadForm.resetFields();
        }}
        onOk={handleUploadMaterial}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Bài tập buổi 1" />
          </Form.Item>

          <Form.Item label="File" required>
            <Upload
              beforeUpload={(file) => {
                setUploadFile(file);
                return false;
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Alert,
  message,
  Divider,
  Modal,
  Popconfirm,
  Progress,
  Tooltip,
  Empty,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import { getApiConfig } from '@/services/api/apiConfig';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

type Class = any;
type Room = any;
type Teacher = any;
type Student = any;

export function SchedulingPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // State danh sách
  const [classes, setClasses] = useState<Class[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);

  // Lớp được chọn và chi tiết
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedClassDetails, setSelectedClassDetails] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // State Modal Xếp học viên
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [unenrollLoadingId, setUnenrollLoadingId] = useState<number | null>(null);

  // ================= FETCH CLASSES =================
  const fetchClasses = async () => {
    try {
      const res = await classService.getAll({ limit: 100 });
      setClasses(res.data || []);
    } catch {
      message.error('Lỗi tải danh sách lớp học');
    }
  };

  // ================= FETCH STUDENTS =================
  const fetchAllStudents = async () => {
    try {
      const res = await studentService.getAll({ limit: 500, status: 'active' });
      const list = Array.isArray(res) ? res : res.data || [];
      setAllStudents(list);
    } catch {
      // bỏ qua lỗi ngầm
    }
  };

  // ================= FETCH CLASS DETAILS =================
  const fetchClassDetails = async (classId: number) => {
    try {
      setDetailsLoading(true);
      const res = await classService.getById(classId);
      setSelectedClassDetails(res.data);
    } catch (err: any) {
      console.error(err);
      message.error('Không thể tải chi tiết học viên trong lớp');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchAllStudents();
  }, []);

  // ================= HELPER =================
  const dayMapReverse: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };

  const parseScheduleDays = (days: any): number[] => {
    if (Array.isArray(days)) {
      return days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    }

    if (typeof days !== 'string') return [];

    const trimmed = days.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
      }
    } catch {
      // Fallback
    }

    return trimmed
      .split(',')
      .map((day: string) => day.trim())
      .map((day: string) => dayMapReverse[day] ?? Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  };

  const parseScheduleTime = (time: any): string[] => {
    if (Array.isArray(time)) {
      return time.map(String).filter(Boolean).slice(0, 2);
    }

    if (typeof time !== 'string') return [];

    const trimmed = time.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean).slice(0, 2);
      }
    } catch {
      // Fallback
    }

    const matches = trimmed.match(/\d{1,2}:\d{2}/g);
    return matches ? matches.slice(0, 2) : [];
  };

  const convertDays = (days: string) => parseScheduleDays(days).join(',');
  const convertTime = (time: string) => parseScheduleTime(time).join(',');

  const formatSchedule = (cls: Class) => {
    const days = parseScheduleDays(cls.schedule_days).join(',');
    const time = parseScheduleTime(cls.schedule_time).join(' - ');
    return `${days || cls.schedule_days} (${time || cls.schedule_time})`;
  };

  // ================= LOAD AVAILABLE ROOMS & TEACHERS =================
  const loadAvailable = async (cls: Class) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        class_id: String(cls.id),
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

      if (!roomRes.ok) throw new Error(roomJson.message || 'Không thể tải phòng rảnh');
      if (!teacherRes.ok) throw new Error(teacherJson.message || 'Không thể tải giảng viên rảnh');

      setRooms(roomJson.data || []);
      setTeachers(teacherJson.data || []);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể load phòng / giáo viên');
    } finally {
      setLoading(false);
    }
  };

  // ================= SELECT CLASS =================
  const handleClassChange = (classId: number) => {
    const cls = classes.find((c) => c.id === classId);
    setSelectedClass(cls || null);

    if (cls) {
      form.setFieldsValue({
        classId: cls.id,
        room_id: cls.room_id || undefined,
        teacher_id: cls.teacher_id || undefined,
      });
      loadAvailable(cls);
      fetchClassDetails(cls.id);
    } else {
      setSelectedClassDetails(null);
      form.setFieldsValue({
        classId: undefined,
        room_id: undefined,
        teacher_id: undefined,
      });
    }
  };

  // ================= ASSIGN TEACHER & ROOM =================
  const handleAssign = async () => {
    try {
      const values = await form.validateFields(['classId', 'room_id', 'teacher_id']);

      await classService.update(values.classId, {
        room_id: values.room_id,
        teacher_id: values.teacher_id,
      });

      message.success('Xếp giảng viên & phòng học thành công');

      fetchClasses();
      if (selectedClass) {
        fetchClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      message.error(err?.message || 'Xếp lớp thất bại');
    }
  };

  // ================= ENROLL STUDENTS =================
  const handleEnrollStudents = async () => {
    if (!selectedClass) {
      message.warning('Vui lòng chọn lớp học');
      return;
    }
    if (selectedStudentIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 học viên');
      return;
    }

    try {
      setEnrollLoading(true);
      const res = await classService.enrollStudents(selectedClass.id, selectedStudentIds);
      const successful = res.data?.successful || [];
      const failed = res.data?.failed || [];

      if (failed.length === 0) {
        message.success(`Xếp thành công ${successful.length} học viên vào lớp!`);
      } else {
        Modal.info({
          title: 'Kết quả xếp học viên vào lớp',
          width: 600,
          content: (
            <div className="space-y-3">
              <Alert
                type={successful.length > 0 ? 'success' : 'warning'}
                showIcon
                message={`Thành công: ${successful.length} học viên | Trùng/Lỗi: ${failed.length} học viên`}
              />
              <Table
                size="small"
                pagination={false}
                rowKey="student_id"
                dataSource={failed}
                columns={[
                  {
                    title: 'Học viên',
                    render: (r: any) => {
                      const st = allStudents.find((s) => s.id === r.student_id);
                      return st ? `${st.full_name} (${st.email || 'ID: ' + r.student_id})` : `#${r.student_id}`;
                    },
                  },
                  {
                    title: 'Lý do từ chối',
                    dataIndex: 'reason',
                    render: (text: string) => <Tag color="red">{text}</Tag>,
                  },
                ]}
              />
            </div>
          ),
        });
      }

      setEnrollModalOpen(false);
      setSelectedStudentIds([]);
      fetchClassDetails(selectedClass.id);
      fetchClasses();
    } catch (err: any) {
      message.error(err.message || 'Xếp học viên thất bại');
    } finally {
      setEnrollLoading(false);
    }
  };

  // ================= UNENROLL STUDENT =================
  const handleUnenrollStudent = async (studentId: number) => {
    if (!selectedClass) return;
    try {
      setUnenrollLoadingId(studentId);
      await classService.unenrollStudent(selectedClass.id, studentId);
      message.success('Đã hủy ghi danh học viên khỏi lớp');
      fetchClassDetails(selectedClass.id);
      fetchClasses();
    } catch (err: any) {
      message.error(err.message || 'Hủy ghi danh thất bại');
    } finally {
      setUnenrollLoadingId(null);
    }
  };

  // Danh sách học viên hiện tại trong lớp
  const enrolledList = selectedClassDetails?.classEnrollments || [];
  const enrolledStudentIds = new Set(
    enrolledList.map((e: any) => e.student_id || e.student?.id)
  );

  // Danh sách ứng viên học viên có thể thêm vào lớp
  const candidateStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id));

  // Tính phần trăm sĩ số
  const maxStudents = selectedClassDetails?.max_students || selectedClass?.max_students || 0;
  const currentCount = enrolledList.length;
  const capacityPercent = maxStudents > 0 ? Math.min(100, Math.round((currentCount / maxStudents) * 100)) : 0;
  const remainingSlots = maxStudents > 0 ? Math.max(0, maxStudents - currentCount) : 'Không giới hạn';

  return (
    <div>
      <PageHeader
        title="Xếp lớp & Phân bổ tài nguyên"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Xếp lớp' },
        ]}
        actions={
          <Space>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => navigate('/lms/schedule')}
            >
              Lịch học tổng thể (Calendar)
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchClasses();
                if (selectedClass) {
                  fetchClassDetails(selectedClass.id);
                  loadAvailable(selectedClass);
                }
              }}
            >
              Làm mới
            </Button>
          </Space>
        }
      />

      {/* ================= PHẦN 1: XẾP GIẢNG VIÊN VÀ PHÒNG HỌC ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ================= FORM XẾP LỚP ================= */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-blue-500" />
              <span>Phân công Giảng viên & Phòng học</span>
            </div>
          }
        >
          <Form form={form} layout="vertical">
            {/* CLASS SELECT */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">
                Chọn lớp học <span className="text-red-500">*</span>
              </span>
              <label className="text-xs text-blue-600 cursor-pointer flex items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  onChange={(e) => setOnlyUnassigned(e.target.checked)}
                  className="rounded cursor-pointer"
                />
                Chỉ hiện lớp chưa có giảng viên
              </label>
            </div>
            <Form.Item
              name="classId"
              rules={[{ required: true, message: 'Vui lòng chọn lớp học' }]}
            >
              <Select
                placeholder={
                  (onlyUnassigned
                    ? classes.filter((c) => !c.teacher_id && !c.teacher)
                    : classes
                  ).length === 0
                    ? 'Không có lớp nào chưa có giảng viên'
                    : 'Chọn lớp học cần phân công'
                }
                onChange={handleClassChange}
                showSearch
                optionFilterProp="label"
                options={(onlyUnassigned
                  ? classes.filter((c) => !c.teacher_id && !c.teacher)
                  : classes
                ).map((c) => ({
                  label: c.teacher?.full_name
                    ? `${c.name} (Đang dạy: ${c.teacher.full_name})`
                    : `${c.name} (Chưa có GV)`,
                  value: c.id,
                }))}
              />
            </Form.Item>

            {/* ROOM SELECT */}
            <Form.Item name="room_id" label="Chọn phòng học">
              <Select
                loading={loading}
                placeholder={selectedClass ? 'Chọn phòng học phù hợp' : 'Chọn lớp trước'}
                disabled={!selectedClass}
                allowClear
                options={rooms.map((r) => ({
                  label:
                    r.is_available !== false
                      ? `${r.name} (Sức chứa: ${r.capacity}) - Rảnh`
                      : `${r.name} (Đang bận khung giờ này)`,
                  value: r.id,
                  disabled: r.is_available === false,
                }))}
              />
            </Form.Item>

            {/* TEACHER SELECT */}
            <Form.Item name="teacher_id" label="Chọn giảng viên">
              <Select
                loading={loading}
                placeholder={selectedClass ? 'Chọn giảng viên phụ trách' : 'Chọn lớp trước'}
                disabled={!selectedClass}
                allowClear
                options={teachers.map((t) => ({
                  label:
                    t.is_available !== false
                      ? `${t.full_name} (${t.email || 'GV'}) - Rảnh`
                      : `${t.full_name} (Đang bận khung giờ này)`,
                  value: t.id,
                  disabled: t.is_available === false,
                }))}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAssign}
                  disabled={!selectedClass}
                >
                  Lưu phân công
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setSelectedClass(null);
                    setSelectedClassDetails(null);
                    setRooms([]);
                    setTeachers([]);
                  }}
                >
                  Hủy chọn
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* ================= PREVIEW LỚP & TÀI NGUYÊN ================= */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <UserOutlined className="text-emerald-500" />
              <span>Thông tin lớp & Tình trạng tài nguyên</span>
            </div>
          }
        >
          {selectedClass ? (
            <div className="space-y-4">
              <Alert
                type="info"
                showIcon
                message={<span className="font-semibold text-base">{selectedClass.name}</span>}
                description={
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-700">
                    <div>
                      <b>Giảng viên hiện tại:</b>{' '}
                      {selectedClass.teacher?.full_name ? (
                        <Tag color="green">{selectedClass.teacher.full_name}</Tag>
                      ) : (
                        <Tag color="orange">Chưa phân công</Tag>
                      )}
                    </div>
                    <div>
                      <b>Phòng hiện tại:</b>{' '}
                      {selectedClass.room?.name ? (
                        <Tag color="blue">{selectedClass.room.name}</Tag>
                      ) : (
                        <Tag color="orange">Chưa phân phòng</Tag>
                      )}
                    </div>
                    <div>
                      <b>Lịch học:</b> {formatSchedule(selectedClass)}
                    </div>
                    <div>
                      <b>Thời gian:</b>{' '}
                      {new Date(selectedClass.start_date).toLocaleDateString('vi-VN')} -{' '}
                      {new Date(selectedClass.end_date).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                }
              />

              {/* ROOM TABLE */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="font-semibold text-sm text-gray-700">Tình trạng phòng học</h4>
                  <span className="text-xs text-gray-400">
                    {rooms.filter((r) => r.is_available !== false).length}/{rooms.length} phòng rảnh
                  </span>
                </div>
                <Table
                  dataSource={rooms}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Tên phòng', dataIndex: 'name' },
                    { title: 'Sức chứa', dataIndex: 'capacity' },
                    {
                      title: 'Trạng thái',
                      render: (row: any) =>
                        row.is_available !== false ? (
                          <Tag color="green">Rảnh</Tag>
                        ) : (
                          <Tag color="red">Đang bận</Tag>
                        ),
                    },
                  ]}
                />
              </div>

              {/* TEACHER TABLE */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="font-semibold text-sm text-gray-700">Tình trạng giảng viên</h4>
                  <span className="text-xs text-gray-400">
                    {teachers.filter((t) => t.is_available !== false).length}/{teachers.length} GV rảnh
                  </span>
                </div>
                <Table
                  dataSource={teachers}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Họ và tên', dataIndex: 'full_name' },
                    {
                      title: 'Trạng thái',
                      render: (row: any) =>
                        row.is_available !== false ? (
                          <Tag color="green">Rảnh</Tag>
                        ) : (
                          <Tag color="red">Đang bận</Tag>
                        ),
                    },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400">
              <CalendarOutlined style={{ fontSize: 36 }} className="mb-2 text-gray-300" />
              <div>Vui lòng chọn một lớp học ở bên trái để kiểm tra tài nguyên</div>
            </div>
          )}
        </Card>
      </div>

      <Divider />

      {/* ================= PHẦN 2: XẾP HỌC VIÊN VÀO LỚP ================= */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-purple-600" />
            <span>Xếp học viên vào lớp (Student Scheduling & Enrollment)</span>
          </div>
        }
        extra={
          <Space>
            {selectedClass && (
              <Button
                icon={<BookOutlined />}
                onClick={() => navigate(`/lms/classes/${selectedClass.id}`)}
              >
                Mở chi tiết lớp
              </Button>
            )}
            <Button
              type="primary"
              icon={<UsergroupAddOutlined />}
              disabled={!selectedClass}
              onClick={() => {
                setSelectedStudentIds([]);
                setEnrollModalOpen(true);
              }}
            >
              Thêm học viên vào lớp
            </Button>
          </Space>
        }
      >
        {!selectedClass ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Vui lòng chọn một lớp học ở trên để quản lý và xếp học viên vào lớp"
          />
        ) : (
          <div className="space-y-4">
            {/* THỐNG KÊ SĨ SỐ */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span>Lớp: {selectedClassDetails?.name || selectedClass.name}</span>
                  <Tag color="purple">
                    {currentCount} / {maxStudents || '∞'} học viên
                  </Tag>
                </div>
                <div className="text-xs text-gray-500">
                  Số chỗ còn trống: <b className="text-purple-700">{remainingSlots}</b>
                  {maxStudents > 0 && currentCount >= maxStudents && (
                    <span className="text-red-500 ml-2 font-medium">(Lớp đã đầy sĩ số)</span>
                  )}
                </div>
              </div>
              <div className="w-full md:w-64">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Độ lấp đầy</span>
                  <span>{capacityPercent}%</span>
                </div>
                <Progress
                  percent={capacityPercent}
                  showInfo={false}
                  strokeColor={
                    capacityPercent >= 100
                      ? '#ef4444'
                      : capacityPercent >= 80
                      ? '#f59e0b'
                      : '#8b5cf6'
                  }
                />
              </div>
            </div>

            {/* DANH SÁCH HỌC VIÊN TRONG LỚP */}
            <Table
              loading={detailsLoading}
              dataSource={enrolledList}
              rowKey={(record) => record.id || record.student_id}
              pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} học viên` }}
              locale={{
                emptyText: (
                  <div className="py-8 text-center text-gray-400">
                    <TeamOutlined style={{ fontSize: 32 }} className="mb-2 text-gray-300" />
                    <div>Chưa có học viên nào được xếp vào lớp này.</div>
                    <Button
                      type="link"
                      icon={<UsergroupAddOutlined />}
                      onClick={() => {
                        setSelectedStudentIds([]);
                        setEnrollModalOpen(true);
                      }}
                    >
                      Xếp học viên ngay
                    </Button>
                  </div>
                ),
              }}
              columns={[
                {
                  title: '#',
                  width: 55,
                  render: (_: any, __: any, index: number) => index + 1,
                },
                {
                  title: 'Họ và tên',
                  render: (record: any) => (
                    <div className="font-medium text-gray-900">
                      {record.student?.full_name || record.student_name || `ID: ${record.student_id}`}
                    </div>
                  ),
                },
                {
                  title: 'Email',
                  render: (record: any) => record.student?.email || '—',
                },
                {
                  title: 'Số điện thoại',
                  render: (record: any) => record.student?.phone || '—',
                },
                {
                  title: 'Ngày ghi danh',
                  render: (record: any) =>
                    record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY') : '—',
                },
                {
                  title: 'Trạng thái',
                  render: (record: any) => {
                    const st = record.status || 'active';
                    return st === 'active' ? (
                      <Tag color="green">Đang học</Tag>
                    ) : st === 'dropped' ? (
                      <Tag color="red">Đã thôi học</Tag>
                    ) : (
                      <Tag>{st}</Tag>
                    );
                  },
                },
                {
                  title: 'Thao tác',
                  width: 140,
                  render: (record: any) => (
                    <Popconfirm
                      title="Xác nhận hủy ghi danh"
                      description={`Bạn có chắc muốn xóa học viên ${
                        record.student?.full_name || ''
                      } khỏi lớp này?`}
                      onConfirm={() => handleUnenrollStudent(record.student_id || record.student?.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, loading: unenrollLoadingId === (record.student_id || record.student?.id) }}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={unenrollLoadingId === (record.student_id || record.student?.id)}
                      >
                        Xóa khỏi lớp
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      {/* ================= MODAL THÊM HỌC VIÊN ================= */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <UsergroupAddOutlined className="text-purple-600" />
            <span>Thêm học viên vào lớp: {selectedClassDetails?.name || selectedClass?.name}</span>
          </div>
        }
        open={enrollModalOpen}
        onCancel={() => {
          setEnrollModalOpen(false);
          setSelectedStudentIds([]);
        }}
        onOk={handleEnrollStudents}
        confirmLoading={enrollLoading}
        width={650}
        okText="Xác nhận thêm học viên"
        cancelText="Đóng"
      >
        <div className="space-y-4 py-2">
          <Alert
            type="info"
            showIcon
            message={
              <div>
                Hệ thống sẽ <b>tự động kiểm tra trùng lịch học</b> với các lớp khác mà học viên đang tham gia, đồng thời kiểm tra rào cản sĩ số tối đa.
              </div>
            }
          />

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              Chọn danh sách học viên ({candidateStudents.length} học viên có thể thêm):
            </div>
            <Select
              mode="multiple"
              className="w-full"
              placeholder="Gõ tên hoặc email để tìm kiếm và chọn học viên..."
              value={selectedStudentIds}
              onChange={setSelectedStudentIds}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={candidateStudents.map((s) => ({
                value: s.id,
                label: `${s.full_name} (${s.email || s.phone || 'ID: ' + s.id})`,
              }))}
              maxTagCount="responsive"
            />
          </div>

          {selectedStudentIds.length > 0 && (
            <div className="text-xs text-purple-700 bg-purple-50 p-2.5 rounded border border-purple-100 flex justify-between items-center">
              <span>Đã chọn: <b>{selectedStudentIds.length}</b> học viên</span>
              {maxStudents > 0 && (
                <span>
                  Sĩ số sau khi thêm: <b>{currentCount + selectedStudentIds.length} / {maxStudents}</b>
                </span>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

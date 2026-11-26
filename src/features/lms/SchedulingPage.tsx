import { EnrollmentStudentSelect } from './EnrollmentStudentSelect';
import { useSearchInput } from '../../shared/hooks/useSearchInput';
import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Empty,
  Pagination,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  WarningOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { classService } from '@/services/api/class.service';
import { getApiConfig } from '@/services/api/apiConfig';
import { useNavigate, useSearchParams } from 'react-router';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedClass = Number(searchParams.get('class_id'));

  // State danh sách
  const [classes, setClasses] = useState<Class[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [classSearch, setClassSearch] = useState(''), [classPage, setClassPage] = useState(1);
  const [classTotal, setClassTotal] = useState(0), [classesLoading, setClassesLoading] = useState(false), [classesError, setClassesError] = useState('');
  const classRequest = useRef(0);
  const { searchDraft: classSearchDraft, setSearchDraft: setClassSearchDraft } = useSearchInput(classSearch, search => { setClassSearch(search); setClassPage(1); });

  // Lớp được chọn và chi tiết
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedClassDetails, setSelectedClassDetails] = useState<Class | null>(null);
  const selectedClassId = useRef<number | undefined>(selectedClass?.id); selectedClassId.current = selectedClass?.id;
  const detailsRequest = useRef(0);
  const [detailsError, setDetailsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const availabilityRequest = useRef(0);
  const availabilityAbort = useRef<AbortController | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // State Modal Xếp học viên
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [unenrollLoadingId, setUnenrollLoadingId] = useState<number | null>(null);
  const [conflictsMap, setConflictsMap] = useState<Record<number, { has_conflict: boolean; is_already_enrolled?: boolean; reason?: string }>>({});
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [conflictRevision, setConflictRevision] = useState(0);
  const [onlyFreeStudents, setOnlyFreeStudents] = useState(false);
  const [allowConflicts, setAllowConflicts] = useState(false);

  // ================= FETCH CLASSES =================
  const fetchClasses = async () => {
    const request = ++classRequest.current;
    setClassesLoading(true); setClassesError('');
    try {
      const res = await classService.getAll({ page: classPage, limit: 20, search: classSearch || undefined,
        unassigned_teacher: onlyUnassigned || undefined });
      if (request !== classRequest.current) return;
      const count = res.pagination?.total || 0, last = Math.max(1, Math.ceil(count / 20));
      if (classPage > last) { setClassPage(last); return; }
      setClasses(res.data || []); setClassTotal(count);
    } catch (err: any) { if (request === classRequest.current) { setClasses([]); setClassesError(err.message || 'Không tải được lớp học.'); } }
    finally { if (request === classRequest.current) setClassesLoading(false); }
  };
  useEffect(() => { fetchClasses(); return () => { classRequest.current++; }; }, [classPage, classSearch, onlyUnassigned]);

  // ================= FETCH CLASS DETAILS =================
  const fetchClassDetails = async (classId: number) => {
    const request = ++detailsRequest.current;
    try {
      setDetailsLoading(true); setDetailsError('');
      const res = await classService.getById(classId);
      if (request !== detailsRequest.current || classId !== selectedClassId.current) return;
      setSelectedClassDetails(res.data);
    } catch (err: any) {
      if (request === detailsRequest.current && classId === selectedClassId.current) {
        setSelectedClassDetails(null); setDetailsError(err.message || 'Không thể tải chi tiết học viên trong lớp');
      }
    } finally {
      if (request === detailsRequest.current && classId === selectedClassId.current) setDetailsLoading(false);
    }
  };

  useEffect(() => {
    return () => { selectedClassId.current = undefined; detailsRequest.current++; availabilityAbort.current?.abort(); };
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


  const formatSchedule = (cls: Class) => {
    const days = parseScheduleDays(cls.schedule_days).map(day => day === 0 ? 'CN' : `Thứ ${day + 1}`).join(', ');
    const time = parseScheduleTime(cls.schedule_time).join(' - ');
    return [days, time].filter(Boolean).join(' · ') || 'Chưa có lịch học';
  };

  // ================= LOAD AVAILABLE ROOMS & TEACHERS =================
  const loadAvailable = async (cls: Class) => {
    availabilityAbort.current?.abort();
    const controller = new AbortController(); availabilityAbort.current = controller;
    const request = ++availabilityRequest.current;
    try {
      setLoading(true);
      setAvailabilityError(''); setRooms([]); setTeachers([]);

      const params = new URLSearchParams({ class_id: String(cls.id) });

      const [roomRes, teacherRes] = await Promise.all([
        fetch(`${config.baseURL}/rooms/available?${params}`, {
          headers: getAuthHeader(),
          signal: controller.signal,
        }),
        fetch(`${config.baseURL}/teachers/available?${params}`, {
          headers: getAuthHeader(),
          signal: controller.signal,
        }),
      ]);

      const roomJson = await roomRes.json();
      const teacherJson = await teacherRes.json();
      if (controller.signal.aborted || request !== availabilityRequest.current || cls.id !== selectedClassId.current) return;

      if (!roomRes.ok) throw new Error(roomJson.message || 'Không thể tải phòng rảnh');
      if (!teacherRes.ok) throw new Error(teacherJson.message || 'Không thể tải giảng viên rảnh');

      setRooms(roomJson.data || []);
      setTeachers(teacherJson.data || []);
    } catch (err: any) {
      if (!controller.signal.aborted && request === availabilityRequest.current && cls.id === selectedClassId.current)
        setAvailabilityError(err.message || 'Không tải được phòng/giảng viên rảnh. Vui lòng thử lại.');
    } finally {
      if (request === availabilityRequest.current && cls.id === selectedClassId.current) setLoading(false);
    }
  };

  // ================= SELECT CLASS =================
  const handleClassChange = (classId: number, requested?: Class) => {
    const cls = requested || classes.find((c) => c.id === classId);
    selectedClassId.current = cls?.id;
    detailsRequest.current++;
    setSelectedClassDetails(null); setDetailsError('');
    setEnrollModalOpen(false); setSelectedStudentIds([]); setConflictsMap({}); setConflictError('');
    setSelectedClass(cls || null);

    if (cls) {
      form.setFieldsValue({
        classId: cls.id,
        room_id: cls.room_id || undefined,
        teacher_id: cls.teacher_id || undefined,
      });
      loadAvailable(cls);
      if (requested) { setSelectedClassDetails(requested); setDetailsLoading(false); }
      else fetchClassDetails(cls.id);
    } else {
      setSelectedClassDetails(null);
      form.setFieldsValue({
        classId: undefined,
        room_id: undefined,
        teacher_id: undefined,
      });
    }
  };

  useEffect(() => {
    if (!Number.isInteger(requestedClass) || requestedClass <= 0 || requestedClass > 2147483647) { handleClassChange(0); return; }
    let current = true;
    handleClassChange(0);
    classService.getById(requestedClass).then(result => {
      if (!current) return;
      const cls = result.data;
      handleClassChange(cls.id, cls);
    }).catch(err => { if (current) message.error(err.message || 'Không mở được lớp cần phân công.'); });
    return () => { current = false; };
  }, [requestedClass]);

  // ================= ASSIGN TEACHER & ROOM =================
  const handleAssign = async () => {
    if (assignSaving) return;
    try {
      const values = await form.validateFields(['classId', 'room_id', 'teacher_id']);
      setAssignSaving(true);
      const result = await classService.update(values.classId, {
        room_id: values.room_id ?? null,
        teacher_id: values.teacher_id ?? null,
      });
      if (values.classId !== selectedClassId.current) return;
      message.success(result.message || 'Đã lưu phân công');
      fetchClasses();
      fetchClassDetails(values.classId);
      setSelectedClass(result.data);
      loadAvailable(result.data);
    } catch (err: any) {
      if (!err.errorFields && selectedClassId.current) message.error(err?.message || 'Không lưu được phân công');
    } finally { setAssignSaving(false); }
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
    if (enrollLoading || detailsLoading || detailsError || conflictLoading || conflictError
      || selectedStudentIds.some(id => typeof conflictsMap[id]?.has_conflict !== 'boolean')) {
      message.warning('Vui lòng tải đủ học viên và kiểm tra lịch trước khi xác nhận.'); return;
    }

    const hasConflictedSelected = selectedStudentIds.some((id) => conflictsMap[id]?.has_conflict);
    if (hasConflictedSelected && !allowConflicts) {
      message.warning('Có học viên bị trùng lịch. Vui lòng bỏ chọn hoặc tích xác nhận ghi danh đặc cách.');
      return;
    }

    try {
      setEnrollLoading(true);
      const res = await classService.enrollStudents(selectedClass.id, selectedStudentIds, allowConflicts);
      if (selectedClass.id !== selectedClassId.current) return;
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
      setAllowConflicts(false);
      fetchClassDetails(selectedClass.id);
      fetchClasses();
    } catch (err: any) {
      if (selectedClass.id === selectedClassId.current) message.error(err.message || 'Xếp học viên thất bại');
    } finally {
      setEnrollLoading(false);
    }
  };

  // ================= UNENROLL STUDENT =================
  const handleUnenrollStudent = async (studentId: number) => {
    if (!selectedClass || unenrollLoadingId !== null) return;
    try {
      setUnenrollLoadingId(studentId);
      const result = await classService.unenrollStudent(selectedClass.id, studentId);
      if (selectedClass.id !== selectedClassId.current) return;
      message.success(result.message || 'Đã ghi nhận học viên nghỉ lớp');
      fetchClassDetails(selectedClass.id);
      fetchClasses();
    } catch (err: any) {
      if (selectedClass.id === selectedClassId.current) message.error(err.message || 'Không ghi nhận được trạng thái nghỉ lớp');
    } finally {
      setUnenrollLoadingId(null);
    }
  };

  // Danh sách học viên hiện tại trong lớp
  const enrolledList = useMemo(() => selectedClassDetails?.id === selectedClass?.id ? selectedClassDetails?.classEnrollments || [] : [], [selectedClassDetails, selectedClass?.id]);
  const enrolledStudentIds = new Set(
    enrolledList.filter((e: any) => e.status !== 'dropped').map((e: any) => e.student_id || e.student?.id)
  );

  // Danh sách ứng viên học viên có thể thêm vào lớp
  const candidateStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id));
  const candidateIds = candidateStudents.map(s => s.id).join(',');

  // Tính phần trăm sĩ số
  const maxStudents = selectedClassDetails?.max_students || selectedClass?.max_students || 0;
  const currentCount = enrolledList.filter((item: any) => item.status === 'active').length;
  const capacityPercent = maxStudents > 0 ? Math.min(100, Math.round((currentCount / maxStudents) * 100)) : 0;
  const remainingSlots = maxStudents > 0 ? Math.max(0, maxStudents - currentCount) : 'Không giới hạn';

  useEffect(() => {
    setConflictsMap({}); setConflictError(''); setConflictLoading(false); setAllowConflicts(false);
    if (enrollModalOpen && selectedClass && candidateIds && !detailsLoading && !detailsError) {
      const controller = new AbortController();
      setConflictLoading(true);
      classService
        .checkConflicts(
          selectedClass.id,
          candidateIds.split(',').map(Number), controller.signal
        )
        .then((res) => {
          if (controller.signal.aborted) return;
          if (!res?.data) throw new Error('Không nhận được kết quả kiểm tra lịch.');
          setConflictsMap(res.data);
        })
        .catch((err) => {
          if (!controller.signal.aborted) setConflictError(err.message || 'Không kiểm tra được lịch.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setConflictLoading(false);
        });
      return () => controller.abort();
    }
  }, [enrollModalOpen, selectedClass?.id, candidateIds, conflictRevision, detailsLoading, detailsError]);

  return (
    <div className="crm-page">
      <PageHeader
        title="Xếp lớp"
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
              Lịch học
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
            <Alert className="mb-4" type="info" showIcon message="Phân công mới chỉ áp dụng cho các buổi chưa bắt đầu và chưa có điểm danh."
              description="Bỏ chọn giáo viên hoặc phòng để bỏ phân công các buổi sắp tới. Người phụ trách và phòng của buổi đã học được giữ nguyên." />
            {availabilityError && <Alert className="mb-4" type="error" showIcon message={availabilityError}
              action={<Button onClick={() => selectedClass && loadAvailable(selectedClass)}>Thử lại</Button>} />}
            {/* CLASS SELECT */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">
                Chọn lớp học <span className="text-red-500">*</span>
              </span>
              <label className="text-xs text-blue-600 cursor-pointer flex items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  onChange={e => { setOnlyUnassigned(e.target.checked); setClassPage(1); }}
                  className="rounded cursor-pointer"
                />
                Chỉ hiện lớp chưa có giảng viên
              </label>
            </div>
            <Form.Item
              name="classId"
              rules={[{ required: true, message: 'Vui lòng chọn lớp học' }]}
            >
              <Select aria-label="Tìm lớp cần phân công" placeholder="Tìm tên lớp học"
                value={selectedClass?.id} loading={classesLoading} showSearch filterOption={false}
                searchValue={classSearchDraft} onSearch={setClassSearchDraft}
                onChange={id => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('class_id', String(id)); return next; })}
                disabled={assignSaving || enrollLoading || unenrollLoadingId !== null}
                labelRender={option => selectedClass && option.value === selectedClass.id ? selectedClass.name : option.label}
                options={classes
                  .map(c => ({ value: c.id, label: c.teacher?.full_name ? `${c.name} (${c.teacher.full_name})` : c.name }))}
                popupRender={menu => <>{menu}<div className="p-2 border-t border-gray-100" onMouseDown={event => event.preventDefault()}>
                  <Pagination {...paginationProps('lớp', { current: classPage, pageSize: 20, total: classTotal, size: 'small',
                    showSizeChanger: false, disabled: classesLoading, onChange: setClassPage })} />
                </div></>} />
              {classesError && <Alert className="mt-2" type="error" showIcon message={classesError}
                action={<Button size="small" onClick={fetchClasses}>Thử lại</Button>} />}

            </Form.Item>

            {/* ROOM SELECT */}
            <Form.Item name="room_id" label="Chọn phòng học">
              <Select
                loading={loading}
                placeholder={selectedClass ? 'Chọn phòng học phù hợp' : 'Chọn lớp trước'}
                disabled={!selectedClass || assignSaving}
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
                disabled={!selectedClass || assignSaving}
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
                  loading={assignSaving}
                  disabled={!selectedClass}
                >
                  Lưu phân công
                </Button>
                <Button
                  disabled={assignSaving || enrollLoading || unenrollLoadingId !== null}
                  onClick={() => {
                    form.resetFields();
                    selectedClassId.current = undefined;
                    availabilityAbort.current?.abort(); availabilityRequest.current++;
                    setAvailabilityError(''); setLoading(false);
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
                  pagination={paginationProps('phòng', { defaultPageSize: 5, pageSizeOptions: [5, 10, 20, 50] })}
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
                  pagination={paginationProps('giảng viên', { defaultPageSize: 5, pageSizeOptions: [5, 10, 20, 50] })}
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
              disabled={!selectedClass || detailsLoading || !!detailsError || !['ongoing', 'upcoming'].includes(selectedClassDetails?.status)}
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
            {detailsError && <Alert type="error" showIcon message={detailsError}
              action={<Button onClick={() => fetchClassDetails(selectedClass.id)}>Thử lại</Button>} />}
            {/* THỐNG KÊ SĨ SỐ */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span>Lớp: {selectedClassDetails?.name || selectedClass.name}</span>
                  <Tag color="purple">
                    {detailsLoading || detailsError ? 'Chưa tải được sĩ số' : `${currentCount} / ${maxStudents || '∞'} đang học`}
                  </Tag>
                </div>
                <div className="text-xs text-gray-500">
                  Số chỗ còn trống: <b className="text-purple-700">{detailsLoading || detailsError ? '—' : remainingSlots}</b>
                  <span className="ml-2">Đã nghỉ: {enrolledList.filter((item: any) => item.status === 'dropped').length} · Hoàn thành: {enrolledList.filter((item: any) => item.status === 'completed').length}</span>
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
              pagination={paginationProps('học viên (gồm lịch sử)', { defaultPageSize: 10 })}
              locale={{
                emptyText: (
                  <div className="py-8 text-center text-gray-400">
                    <TeamOutlined style={{ fontSize: 32 }} className="mb-2 text-gray-300" />
                    <div>{detailsError ? 'Không tải được danh sách học viên.' : 'Chưa có học viên nào được xếp vào lớp này.'}</div>
                    <Button
                      type="link"
                      icon={<UsergroupAddOutlined />}
                      disabled={!!detailsError || detailsLoading || !['upcoming', 'ongoing'].includes(selectedClassDetails?.status)}
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
                  filters: [{ text: 'Đang học', value: 'active' }, { text: 'Đã nghỉ lớp', value: 'dropped' }, { text: 'Hoàn thành', value: 'completed' }],
                  onFilter: (value: any, record: any) => record.status === value,
                  render: (record: any) => {
                    const st = record.status || 'active';
                    return st === 'active' ? (
                      <Tag color="green">Đang học</Tag>
                    ) : st === 'dropped' ? (
                      <Tag color="red">Đã nghỉ lớp</Tag>
                    ) : (
                      <Tag>{st === 'completed' ? 'Hoàn thành' : 'Chưa xác định'}</Tag>
                    );
                  },
                },
                {
                  title: 'Thao tác',
                  width: 140,
                  render: (record: any) => record.status === 'active' ? (
                    <Popconfirm
                      title="Cho học viên nghỉ lớp?"
                      description="Giữ nguyên học phí và dữ liệu học tập. Học viên không còn tính vào sĩ số đang học."
                      onConfirm={() => handleUnenrollStudent(record.student_id || record.student?.id)}
                      okText="Cho nghỉ lớp"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, loading: unenrollLoadingId === (record.student_id || record.student?.id) }}
                    >
                      <Button
                        danger
                        size="small"
                        disabled={unenrollLoadingId !== null}
                        loading={unenrollLoadingId === (record.student_id || record.student?.id)}
                      >
                        Cho nghỉ lớp
                      </Button>
                    </Popconfirm>
                  ) : record.status === 'dropped' && ['upcoming', 'ongoing'].includes(selectedClassDetails?.status)
                    && record.student?.status === 'active' ? <Button size="small" disabled={detailsLoading || enrollLoading}
                      onClick={() => { setAllStudents([record.student]); setSelectedStudentIds([record.student_id]); setEnrollModalOpen(true); }}>Ghi danh lại</Button> : '—',
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
          if (enrollLoading) return;
          setEnrollModalOpen(false);
          setSelectedStudentIds([]);
        }}
        onOk={handleEnrollStudents}
        confirmLoading={enrollLoading}
        closable={!enrollLoading}
        maskClosable={!enrollLoading}
        cancelButtonProps={{ disabled: enrollLoading }}
        okButtonProps={{ disabled: detailsLoading || !!detailsError || conflictLoading || !!conflictError
          || !selectedStudentIds.length || selectedStudentIds.some(id => typeof conflictsMap[id]?.has_conflict !== 'boolean') }}
        width={650}
        okText="Xác nhận thêm học viên"
        cancelText="Đóng"
      >
        <div className="space-y-4 py-2">
          <Alert type="info" showIcon message="Học viên đã nghỉ có thể ghi danh lại; học phí và dữ liệu cũ được giữ nguyên."
            description="Cho nghỉ lớp hoặc ghi danh lại không tự hủy, hoàn tiền hay tạo thêm học phí. Kiểm tra học phí tại hồ sơ học viên nếu cần điều chỉnh." />
          {conflictError && <Alert type="error" showIcon message={conflictError}
            action={<Button onClick={() => setConflictRevision(value => value + 1)}>Thử lại</Button>} />}
          <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
            <span className="text-xs text-gray-600">
              {conflictLoading ? (
                <span className="text-blue-600 font-medium">Đang kiểm tra lịch trống của học viên...</span>
              ) : (
                <span>Trống lịch · Trùng lịch · Chưa kiểm tra</span>
              )}
            </span>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFreeStudents}
                disabled={conflictLoading || !!conflictError || enrollLoading}
                onChange={(e) => setOnlyFreeStudents(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Chỉ hiện học viên không trùng lịch</span>
            </label>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              Chọn học viên · tìm kiếm và chuyển trang ở danh sách bên dưới
            </div>
            {selectedClass && <EnrollmentStudentSelect classId={selectedClass.id} active={enrollModalOpen}
              value={selectedStudentIds} seedStudents={allStudents} disabled={enrollLoading}
              conflicts={conflictsMap} onlyFree={onlyFreeStudents} onCandidates={setAllStudents}
              onChange={(ids) => setSelectedStudentIds(ids)} />}

          </div>

          {selectedStudentIds.some((id) => conflictsMap[id]?.has_conflict) && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                <WarningOutlined className="text-amber-600 text-sm" />
                <span>Phát hiện học viên đã chọn có lịch học trùng với lớp này:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {selectedStudentIds
                  .filter((id) => conflictsMap[id]?.has_conflict)
                  .map((id) => {
                    const st = allStudents.find((s) => s.id === id);
                    return (
                      <li key={id}>
                        <b>{st?.full_name}</b>: {conflictsMap[id]?.reason}
                      </li>
                    );
                  })}
              </ul>
              <div className="pt-1 border-t border-amber-200">
                <label className="flex items-center gap-2 font-medium text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowConflicts}
                    onChange={(e) => setAllowConflicts(e.target.checked)}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Cho phép ghi danh dù trùng lịch (Admin tự điều chỉnh lịch học)</span>
                </label>
              </div>
            </div>
          )}

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

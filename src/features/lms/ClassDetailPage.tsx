import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useRef, useState } from 'react';
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
  DatePicker,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { RiskEstimate, SupportPriority, RiskDetailsDrawer } from '../../shared/components/DropoutRisk';
import { studentRiskLink, type DropoutRiskView } from '../../shared/utils/dropoutRisk';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useSearchParams } from 'react-router';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { classTab } from '../../shared/utils/navigation';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import { scheduleService } from '@/services/api/schedule.service';
import { SessionAttendanceTag, SessionStatusTag } from './sessionStatus';
import { useAuth } from '../../shared/contexts/AuthContext';
import dayjs from 'dayjs';
import { getClassStatus } from './classFilters';
import { MaterialPanel } from './MaterialPanel';

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
  const { openDetail, navigationState } = useDetailNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const role = user?.role;
  const currentContext = useRef(''); currentContext.current = `${id}:${user?.id}:${role}`;

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [classItem, setClassItem] = useState<Class | null>(null);
  const [classError, setClassError] = useState('');
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [classRiskResults, setClassRiskResults] = useState<Record<number, DropoutRiskView>>({});
  const [riskFetching, setRiskFetching] = useState(false);
  const [riskError, setRiskError] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<{ studentId: number; name: string } | null>(null);
  const riskRequest = useRef(0);
  useEffect(() => {
    setClassRiskResults({});
    setRiskError('');
    setSelectedRisk(null);
    const request = ++riskRequest.current;
    if (!isAdmin && !isTeacher) return;
    setRiskFetching(true);
    classService.getDropoutRisk(Number(id)).then(res => {
      if (request !== riskRequest.current) return;
      setClassRiskResults(Object.fromEntries((res.data || []).map((item: DropoutRiskView) => [item.student_id, item])));
    }).catch(error => { if (request === riskRequest.current) setRiskError(error.message || 'Không tải được cảnh báo của lớp'); })
      .finally(() => { if (request === riskRequest.current) setRiskFetching(false); });
    return () => { riskRequest.current++; };
  }, [id, isAdmin, isTeacher]);

  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState('');

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState<number | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [form] = Form.useForm();

  const canEditClass = isAdmin;

  const fetchClass = async () => {
    const context = currentContext.current;
    try {
      setLoading(true);
      setClassItem(null); setClassError('');
      const res = await classService.getById(Number(id));
      if (context !== currentContext.current) return;
      setClassItem(res.data);
    } catch (err: any) {
      if (context === currentContext.current) setClassError(err.message || 'Không tải được lớp học');
    } finally {
      if (context === currentContext.current) setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!isAdmin) return;
    const context = currentContext.current;
    try {
      setStudentsLoading(true); setStudentsError('');
      const res = await studentService.getEnrollmentOptions();
      if (context !== currentContext.current) return;
      setStudents(res.data || []);
    } catch (error: any) {
      if (context === currentContext.current) { setStudents([]); setStudentsError(error.message || 'Không tải được danh sách học viên'); }
    } finally { if (context === currentContext.current) setStudentsLoading(false); }
  };

  const fetchSchedules = async () => {
    const context = currentContext.current;
    try {
      setSchedulesLoading(true); setSchedulesError('');
      const res = await scheduleService.getByClass(Number(id));
      if (context !== currentContext.current) return;
      setSchedules(res.data || []);
    } catch (error: any) {
      if (context === currentContext.current) { setSchedules([]); setSchedulesError(error.message || 'Không tải được lịch học.'); }
    } finally { if (context === currentContext.current) setSchedulesLoading(false); }
  };

  useEffect(() => {
    const context = `${id}:${user?.id}:${role}`; currentContext.current = context;
    setEnrollModalOpen(false); setSelectedStudentIds([]);
    setEnrollLoading(false); setWithdrawLoading(null);
    setEditSaving(false); setEditModalOpen(false);
    setSchedules([]); setSchedulesError('');
    fetchClass();
    fetchStudents();
    fetchSchedules();
    return () => { if (currentContext.current === context) currentContext.current = ''; };
  }, [id, role, user?.id]);

  if (!classItem) return loading ? <Card loading /> : <Alert type="warning" showIcon message={classError || 'Không tìm thấy lớp học'} />;
  const activeStudentIds = new Set<number>((classItem.classEnrollments || []).filter((item: any) => item.status === 'active').map((item: any) => item.student_id));
  const canEnroll = isAdmin && ['upcoming', 'ongoing'].includes(classItem.status);
  const candidateStudents = students.filter(student => !(classItem.classEnrollments || []).some((item: any) => item.student_id === student.id && item.status !== 'dropped'));
  const activeClassRisks = Object.values(classRiskResults).filter(item => item.student_id && activeStudentIds.has(item.student_id));

  const handleEdit = () => {
    const daysArr = parseDbField<number>(classItem.schedule_days);
    const timeArr = parseDbField<string>(classItem.schedule_time);

    form.setFieldsValue({
      name: classItem.name,
      max_students: classItem.max_students,
      schedule_days: daysArr,
      start_date: classItem.start_date ? dayjs(classItem.start_date) : undefined,
      end_date: classItem.end_date ? dayjs(classItem.end_date) : undefined,
      schedule_time:
        timeArr.length === 2
          ? timeArr.map(value => dayjs(`1970-01-01T${String(value).match(/(?:^|T)(\d{2}:\d{2})/)?.[1]}:00`))
          : undefined,
    });

    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!isAdmin || editSaving) return;
    const context = currentContext.current;
    try {
      const values = await form.validateFields();
      setEditSaving(true);
      const result = await classService.update(classItem.id, {
        name: values.name,
        max_students: values.max_students,
        start_date: values.start_date ? `${values.start_date.format('YYYY-MM-DD')}T00:00:00.000Z` : undefined,
        end_date: values.end_date ? `${values.end_date.format('YYYY-MM-DD')}T00:00:00.000Z` : undefined,
        schedule_days: values.schedule_days as number[],
        schedule_time: values.schedule_time
          ? [
            values.schedule_time[0].format('HH:mm'),
            values.schedule_time[1].format('HH:mm'),
          ]
          : undefined,
      });

      if (context !== currentContext.current) return;
      message.success(result.message || 'Cập nhật thành công');
      setEditModalOpen(false);
      fetchClass();
      fetchSchedules();
    } catch (err: any) {
      if (context === currentContext.current && !err.errorFields) message.error(err.message || 'Lỗi cập nhật');
    } finally { if (context === currentContext.current) setEditSaving(false); }
  };

  const getStatusTag = (status: string) => {
    const s = getClassStatus(status);
    return <Tag color={s.color}>{s.label}</Tag>;
  };

  const handleEnroll = async () => {
    if (!canEnroll || enrollLoading || studentsLoading || studentsError) return;
    if (!selectedStudentIds.length) {
      message.warning('Chọn ít nhất 1 học viên');
      return;
    }

    const context = currentContext.current;
    try {
      setEnrollLoading(true);
      const res = await classService.enrollStudents(classItem.id, selectedStudentIds);
      if (context !== currentContext.current) return;

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
                type={successful.length > 0 ? 'success' : 'warning'}
                message={`Thành công: ${successful.length} học viên`}
                className="mb-4"
              />

              <Table
                size="small"
                pagination={false}
                rowKey="student_id"
                dataSource={failed}
                columns={[
                  { title: 'Học viên', render: (record: any) => students.find(student => student.id === record.student_id)?.full_name || `#${record.student_id}` },
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
      if (context === currentContext.current) message.error(err.message);
    } finally {
      if (context === currentContext.current) setEnrollLoading(false);
    }
  };

  const handleUnenroll = async (studentId: number) => {
    if (!isAdmin || withdrawLoading !== null) return;
    const context = currentContext.current;
    try {
      setWithdrawLoading(studentId);
      const result = await classService.unenrollStudent(classItem.id, studentId);
      if (context !== currentContext.current) return;
      message.success(result.message || 'Đã ghi nhận học viên nghỉ lớp');
      fetchClass();
    } catch (err: any) {
      if (context === currentContext.current) message.error(err.message || 'Không ghi nhận được trạng thái nghỉ lớp');
    } finally { if (context === currentContext.current) setWithdrawLoading(null); }
  };

  const handleScoreClassDropoutRisk = async () => {
    try {
      setRiskLoading(true);
      const request = ++riskRequest.current;
      const res = await classService.scoreDropoutRisk(classItem.id);
      if (request !== riskRequest.current) return;
      const snapshots = await classService.getDropoutRisk(classItem.id);
      if (request !== riskRequest.current) return;
      setClassRiskResults(Object.fromEntries((snapshots.data || []).map((item: DropoutRiskView) => [item.student_id, item])));
      setRiskError('');
      const failed = (res.data || []).filter((item: any) => !item.success).length;
      if (failed) message.warning(`${failed} học viên chưa cập nhật được. Các kết quả đã lưu vẫn được giữ nguyên.`);
      else message.success(res.message || 'Đã cập nhật cảnh báo của lớp');
    } catch (err: any) {
      message.error(err.message || 'Không tính được dropout risk cho lớp');
    } finally {
      setRiskLoading(false);
    }
  };

  return (
    <div className="crm-page">
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
        activeKey={role === 'sale' && searchParams.get('tab') === 'materials' ? 'overview' : classTab(searchParams.get('tab'))}
        onChange={key => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('tab', key); return next; }, { replace: true, state: navigationState })}
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <Card
                loading={loading}

              >
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
                title="Học viên"
                extra={<Space wrap>
                  {(isAdmin || isTeacher) && <Button type="primary" icon={<WarningOutlined />}
                    loading={riskLoading} disabled={riskFetching || classItem.status !== 'ongoing'}
                    onClick={handleScoreClassDropoutRisk}>Đánh giá nguy cơ bỏ học</Button>}
                  {canEnroll && <Button onClick={() => { setSelectedStudentIds([]); setEnrollModalOpen(true); }}>Thêm học viên</Button>}
                </Space>}
              >
                <p className="mb-4 text-gray-600">
                  Sĩ số đang học: <strong>{classItem._count?.classEnrollments || 0}</strong> /{' '}
                  {classItem.max_students}
                </p>

                {(isAdmin || isTeacher) && classItem.status === 'ongoing' && <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  {riskError ? <Alert type="error" showIcon message={riskError} /> : riskFetching ? 'Đang tải cảnh báo…' :
                  <Space size={20} wrap>
                    <span>Cần liên hệ: <strong>{activeClassRisks.filter(item => item.risk_level === 'high').length}</strong></span>
                    <span>Cần theo dõi: <strong>{activeClassRisks.filter(item => item.risk_level === 'medium').length}</strong></span>
                    <span>Chưa xác định: <strong>{activeStudentIds.size - activeClassRisks.filter(item => !!item.risk_level).length}</strong></span>
                    <span className="text-gray-500">Bấm “Xem đánh giá” để xem căn cứ và hướng xử lý.</span>
                  </Space>}
                </div>}

                <Table
                  rowKey="id"
                  size="small"
                  pagination={paginationProps('học viên', { defaultPageSize: 10 })}
                  dataSource={classItem.classEnrollments || []}
                  locale={{ emptyText: 'Chưa có học viên nào trong lớp' }}
                  loading={riskLoading || riskFetching}
                  scroll={{ x: 980 }}
                  columns={[
                    { title: 'Học viên', width: 230, render: (row: any) => <Space direction="vertical" size={0}>
                      <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(`/lms/students/${row.student_id}`)}>{row.student?.full_name || `ID: ${row.student_id}`}</Button>
                      <span className="text-xs text-gray-500">{row.student?.email || '—'}</span>
                    </Space> },
                    { title: 'Điện thoại', width: 125, render: (row: any) => row.student?.phone || '—' },
                    { title: 'Tình trạng', width: 125,
                      filters: [{ text: 'Đang học', value: 'active' }, { text: 'Đã nghỉ lớp', value: 'dropped' }, { text: 'Hoàn thành', value: 'completed' }],
                      onFilter: (value: any, row: any) => row.status === value,
                      render: (row: any) => <Tag color={row.status === 'active' ? 'green' : row.status === 'dropped' ? 'red' : 'default'}>
                      {row.status === 'active' ? 'Đang học' : row.status === 'dropped' ? 'Đã nghỉ lớp' : row.status === 'completed' ? 'Hoàn thành' : row.status}
                    </Tag> },
                    { key: 'priority', title: 'Mức cần hỗ trợ', width: 150, render: (row: any) => classItem.status !== 'ongoing' || row.status !== 'active' ? '—'
                      : riskError ? 'Chưa tải được' : <SupportPriority data={classRiskResults[row.student_id]} /> },
                    { key: 'risk', title: 'Nguy cơ bỏ học', width: 170, render: (row: any) => classItem.status !== 'ongoing' || row.status !== 'active'
                      ? classItem.status === 'upcoming' ? 'Chưa bắt đầu' : 'Đã kết thúc theo dõi' : riskError ? 'Chưa tải được'
                      : <RiskEstimate data={classRiskResults[row.student_id]} showReason={false}
                        onOpen={() => setSelectedRisk({ studentId: row.student_id, name: row.student?.full_name || `ID: ${row.student_id}` })} /> },
                    { title: 'Thao tác', width: 150, render: (row: any) => <Space size={4}>
                      {isAdmin && row.status === 'active' && <Popconfirm title="Cho học viên nghỉ lớp?"
                        description="Giữ nguyên học phí và dữ liệu học tập. Học viên không còn tính vào sĩ số đang học."
                        onConfirm={() => handleUnenroll(row.student_id)} okText="Cho nghỉ lớp" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button type="text" danger size="small" loading={withdrawLoading === row.student_id} disabled={withdrawLoading !== null}>Cho nghỉ lớp</Button>
                      </Popconfirm>}
                      {canEnroll && row.status === 'dropped' && candidateStudents.some(student => student.id === row.student_id)
                        && <Button size="small" onClick={() => { setSelectedStudentIds([row.student_id]); setEnrollModalOpen(true); }}>Ghi danh lại</Button>}
                    </Space> },
                  ].filter(column => !['priority', 'risk'].includes(column.key || '') || isAdmin || isTeacher)}
                />
              </Card>
            ),
          },
          {
            key: 'sessions',
            label: 'Buổi học',
            children: (
              <Card>
                {schedulesError && <Alert className="mb-4" type="error" showIcon message={schedulesError}
                  action={<Button onClick={fetchSchedules}>Thử lại</Button>} />}
                <Table
                  rowKey="id"
                  loading={schedulesLoading}
                  dataSource={schedules}
                  pagination={paginationProps('buổi học', { defaultPageSize: 10 })}
                  locale={{ emptyText: schedulesError ? 'Chưa tải được lịch học' : schedulesLoading ? 'Đang tải lịch học…' : 'Chưa có buổi học nào' }}
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
                      title: 'Giảng viên',
                      render: (row: any) =>
                        row.teacher?.full_name || 'Chưa phân công',
                    },
                    {
                      title: 'Trạng thái',
                      render: (row: any) => <Space size={0} wrap><SessionStatusTag status={row.status} scheduleChange={row.scheduleChange} />
                        <SessionAttendanceTag status={row.status} attendances={row.attendances} personal={user?.role === 'student'} /></Space>,
                    },
                    {
                      title: 'Thao tác',
                      render: (row: any) => (
                        <Space>
                          {isTeacher && row.status !== 'cancelled' && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckCircleOutlined />}
                              onClick={() => openDetail(`/lms/sessions/${row.id}`)}
                            >
                              Điểm danh
                            </Button>
                          )}

                          <Button
                            size="small"
                            onClick={() => openDetail(`/lms/sessions/${row.id}`)}
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
            children: <MaterialPanel classId={classItem.id} />,
          },
        ].filter(item => item.key !== 'materials' || ['admin', 'teacher', 'student'].includes(role || ''))}
      />

      <RiskDetailsDrawer open={!!selectedRisk} onClose={() => setSelectedRisk(null)} name={selectedRisk?.name}
        className={classItem.name} data={selectedRisk ? classRiskResults[selectedRisk.studentId] : undefined}
        loading={riskLoading} onEvaluate={(isAdmin || isTeacher) && selectedRisk && classItem.status === 'ongoing' ? async () => {
          const classId = classItem.id;
          const studentId = selectedRisk.studentId;
          const request = riskRequest.current;
          try {
            setRiskLoading(true);
            const result = await studentService.scoreDropoutRisk(studentId, classId);
            if (!result.data) throw new Error(result.reason || 'Lớp không còn trong giai đoạn theo dõi');
            const snapshots = await classService.getDropoutRisk(classId);
            if (request === riskRequest.current) {
              setClassRiskResults(Object.fromEntries((snapshots.data || []).map((item: DropoutRiskView) => [item.student_id, item])));
              setRiskError('');
            }
          } catch (error: any) { message.error(error.message || 'Không đánh giá được học viên'); }
          finally { setRiskLoading(false); }
        } : undefined}
        onProfile={selectedRisk ? () => openDetail(studentRiskLink(selectedRisk.studentId, classItem.id)) : undefined} />

      <Modal
        title="Chỉnh sửa lớp học"
        open={isAdmin && editModalOpen}
        confirmLoading={editSaving}
        closable={!editSaving}
        maskClosable={!editSaving}
        cancelButtonProps={{ disabled: editSaving }}
        onOk={handleUpdate}
        onCancel={() => { if (!editSaving) setEditModalOpen(false); }}
      >
        <Alert className="mb-4" showIcon type="info" message="Lịch mới chỉ áp dụng cho các buổi chưa bắt đầu."
          description="Các buổi đã học hoặc có điểm danh được giữ nguyên. Buổi sắp tới không còn thuộc lịch mới sẽ được đánh dấu hủy." />
        <Form form={form} layout="vertical" disabled={editSaving}>
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="max_students" label="Sĩ số">
            <InputNumber className="w-full" />
          </Form.Item>

          <Form.Item name="schedule_days" label="Ngày học">
            <Select mode="multiple" placeholder="Chọn các ngày học" options={DAY_OPTIONS} />
          </Form.Item>

          <Form.Item name="start_date" label="Ngày bắt đầu"><DatePicker className="w-full" format="DD/MM/YYYY" allowClear={false} /></Form.Item>
          <Form.Item name="end_date" label="Ngày kết thúc"><DatePicker className="w-full" format="DD/MM/YYYY" allowClear={false} /></Form.Item>

          <Form.Item name="schedule_time" label="Giờ học">
            <TimePicker.RangePicker className="w-full" format="HH:mm" allowClear={false} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm học viên vào lớp"
        open={canEnroll && enrollModalOpen}
        onCancel={() => { if (!enrollLoading) setEnrollModalOpen(false); }}
        onOk={handleEnroll}
        confirmLoading={enrollLoading}
        closable={!enrollLoading}
        maskClosable={!enrollLoading}
        cancelButtonProps={{ disabled: enrollLoading }}
        okButtonProps={{ disabled: !canEnroll || studentsLoading || !!studentsError || !selectedStudentIds.length }}
        width={700}
      >
        <Alert className="mb-4" type="info" showIcon message="Học viên đã nghỉ có thể ghi danh lại; học phí và dữ liệu cũ được giữ nguyên."
          description="Ghi danh lại không tự tạo thêm học phí. Kiểm tra học phí tại hồ sơ học viên nếu cần điều chỉnh." />
        {studentsError && <Alert className="mb-4" type="error" showIcon message={studentsError}
          action={<Button onClick={fetchStudents}>Thử lại</Button>} />}
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Chọn học viên"
          value={selectedStudentIds}
          loading={studentsLoading}
          disabled={enrollLoading || studentsLoading || !!studentsError}
          onChange={setSelectedStudentIds}
          optionFilterProp="label"
          showSearch
          options={candidateStudents.map((s) => ({
            value: s.id,
            label: `${s.full_name} (${s.email})${classItem.classEnrollments?.some((item: any) => item.student_id === s.id && item.status === 'dropped') ? ' · Ghi danh lại' : ''}`,
          }))}
        />
      </Modal>

    </div>
  );
}

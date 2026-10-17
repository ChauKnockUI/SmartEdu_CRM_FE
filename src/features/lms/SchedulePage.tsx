import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Badge,
  Card,
  message,
  Select,
  Button,
  Space,
  Modal,
  Drawer,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Popover,
  Empty,
  Spin,
  Segmented,
  DatePicker,
  Divider,
  Alert,
  Tooltip,
  Popconfirm,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ArrowRightOutlined,
  BookOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { scheduleService } from '@/services/api/schedule.service';
import { classService } from '@/services/api/class.service';
import { teacherService } from '@/services/api/teacher.service';
import { roomService } from '@/services/api/room.service';

dayjs.locale('vi');

interface ScheduleItem {
  id: number;
  class_id?: number | null;
  teacher_id?: number | null;
  room_id?: number | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  status: string;
  notes?: string | null;
  memo?: string | null;
  class?: {
    id: number;
    name: string;
    status?: string;
    course_id?: number | null;
    course?: { id: number; name: string } | null;
    teacher?: { id: number; full_name: string } | null;
    room?: { id: number; name: string } | null;
  } | null;
  room?: { id: number; name: string } | null;
  teacher?: { id: number; full_name: string } | null;
  attendances?: {
    id: number;
    student_id: number;
    status: string;
  }[];
}

const formatTime = (timeVal?: string | null) => {
  if (!timeVal) return '';
  const text = String(timeVal);
  const match = text.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5);
  return text;
};

export const isScheduleOverdue = (item: ScheduleItem) => {
  if (item.status === 'cancelled') return false;
  if (item.attendances && item.attendances.length > 0) return false;
  const now = dayjs();
  const itemDateStr = dayjs(item.date).format('YYYY-MM-DD');
  const todayStr = now.format('YYYY-MM-DD');
  if (itemDateStr < todayStr) return true;
  if (itemDateStr === todayStr && item.end_time) {
    const endStr = formatTime(item.end_time);
    if (endStr) {
      const [hours, minutes] = endStr.split(':').map(Number);
      const sessionEnd = dayjs().hour(hours).minute(minutes).second(0);
      return now.isAfter(sessionEnd);
    }
  }
  return false;
};

export function SchedulePage() {
  const navigate = useNavigate();

  // State dữ liệu
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Trạng thái gửi nhắc nhở điểm danh
  const [remindingId, setRemindingId] = useState<number | null>(null);
  const [remindingAll, setRemindingAll] = useState(false);

  // Bộ lọc
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>();
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [calendarDate, setCalendarDate] = useState<Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Modal & Drawer tương tác
  const [selectedSession, setSelectedSession] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [dayDrawerDate, setDayDrawerDate] = useState<Dayjs | null>(null);

  // Tải dữ liệu ban đầu
  const fetchFilterOptions = async () => {
    try {
      const [classRes, teacherRes, roomRes] = await Promise.all([
        classService.getAll({ limit: 100 }),
        teacherService.getAll({ limit: 100 }),
        roomService.getAll({ limit: 100 }),
      ]);
      setClassesList(classRes.data || []);
      setTeachersList(teacherRes.data || []);
      setRoomsList(roomRes.data || []);
    } catch {
      // bỏ qua lỗi filter ngầm
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await scheduleService.getAll();
      setSchedules(res.data || []);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi tải lịch học');
    } finally {
      setLoading(false);
    }
  };

  const handleRemindSession = async (session: ScheduleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setRemindingId(session.id);
      const res = await scheduleService.remindAttendance(session.id);
      message.success(res.message || 'Đã gửi thông báo nhắc giảng viên điểm danh!');
    } catch (err: any) {
      message.error(err.message || 'Không thể gửi thông báo nhắc điểm danh');
    } finally {
      setRemindingId(null);
    }
  };

  const handleRemindAllOverdue = async () => {
    try {
      setRemindingAll(true);
      const res = await scheduleService.remindAllOverdue();
      message.success(res.message || 'Đã gửi thông báo nhắc nhở điểm danh cho các giảng viên!');
      fetchSchedules();
    } catch (err: any) {
      message.error(err.message || 'Lỗi quét và gửi thông báo hàng loạt');
    } finally {
      setRemindingAll(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchSchedules();
  }, []);

  // Tổng số buổi học quá hạn chưa điểm danh (trên toàn bộ hệ thống)
  const totalOverdueAcrossAll = useMemo(() => {
    return schedules.filter(isScheduleOverdue).length;
  }, [schedules]);

  // Lọc lịch học theo các tiêu chí đã chọn
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // Lọc theo lớp
      if (selectedClassId && item.class_id !== selectedClassId) return false;

      // Lọc theo giáo viên (ưu tiên giáo viên của buổi, nếu không có thì lấy GV lớp)
      if (selectedTeacherId) {
        const assignedTeacherId = item.teacher_id || item.class?.teacher?.id;
        if (assignedTeacherId !== selectedTeacherId) return false;
      }

      // Lọc theo phòng học (ưu tiên phòng của buổi, nếu không có thì lấy phòng lớp)
      if (selectedRoomId) {
        const assignedRoomId = item.room_id || item.class?.room?.id;
        if (assignedRoomId !== selectedRoomId) return false;
      }

      // Lọc theo trạng thái điểm danh / hủy / quá hạn
      if (selectedStatus) {
        if (selectedStatus === 'attended' && (!item.attendances || item.attendances.length === 0)) {
          return false;
        }
        if (selectedStatus === 'unattended' && item.attendances && item.attendances.length > 0) {
          return false;
        }
        if (selectedStatus === 'overdue' && !isScheduleOverdue(item)) {
          return false;
        }
        if (selectedStatus === 'cancelled' && item.status !== 'cancelled') {
          return false;
        }
      }

      // Lọc khoảng ngày (chế độ Table)
      if (viewMode === 'table' && dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = dayjs(item.date);
        if (itemDate.isBefore(dateRange[0], 'day') || itemDate.isAfter(dateRange[1], 'day')) {
          return false;
        }
      }

      return true;
    });
  }, [
    schedules,
    selectedClassId,
    selectedTeacherId,
    selectedRoomId,
    selectedStatus,
    dateRange,
    viewMode,
  ]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = filteredSchedules.length;
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todaySessions = filteredSchedules.filter(
      (s) => dayjs(s.date).format('YYYY-MM-DD') === todayStr
    );
    const attended = filteredSchedules.filter(
      (s) => s.attendances && s.attendances.length > 0
    ).length;
    const overdueCount = filteredSchedules.filter(isScheduleOverdue).length;
    const activeClasses = new Set(filteredSchedules.map((s) => s.class_id).filter(Boolean)).size;

    return {
      total,
      todayCount: todaySessions.length,
      attended,
      attendedRate: total > 0 ? Math.round((attended / total) * 100) : 0,
      overdueCount,
      activeClasses,
    };
  }, [filteredSchedules]);

  // Lấy các buổi học của một ngày cụ thể trên Calendar
  const getDaySessions = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return filteredSchedules.filter(
      (s) => dayjs(s.date).format('YYYY-MM-DD') === dateStr
    );
  };

  const handleOpenSessionModal = (session: ScheduleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSession(session);
    setModalOpen(true);
  };

  const handleDateSelect = (date: Dayjs) => {
    setCalendarDate(date);
    const daySessions = getDaySessions(date);
    if (daySessions.length > 0) {
      setDayDrawerDate(date);
      setDayDrawerOpen(true);
    }
  };

  const handleResetFilters = () => {
    setSelectedClassId(undefined);
    setSelectedTeacherId(undefined);
    setSelectedRoomId(undefined);
    setSelectedStatus(undefined);
    setDateRange(null);
  };

  // Render từng ô ngày trên Calendar
  const dateCellRender = (date: Dayjs) => {
    const daySessions = getDaySessions(date);
    if (daySessions.length === 0) return null;

    const maxDisplay = 2;
    const visibleSessions = daySessions.slice(0, maxDisplay);
    const remainingCount = daySessions.length - maxDisplay;

    return (
      <div className="space-y-1 mt-1">
        {visibleSessions.map((item) => {
          const isAttended = item.attendances && item.attendances.length > 0;
          const isCancelled = item.status === 'cancelled';
          const timeStr = item.start_time ? formatTime(item.start_time) : '';
          const roomName = item.room?.name || item.class?.room?.name || '';
          const teacherName = item.teacher?.full_name || item.class?.teacher?.full_name || '';

          const badgeColor = isCancelled ? 'red' : isAttended ? 'green' : 'blue';

          const popoverContent = (
            <div className="text-xs space-y-1.5 p-1 max-w-xs">
              <div className="font-semibold text-sm text-gray-800">
                {item.class?.name || 'Buổi học'}
              </div>
              <div className="text-gray-600 flex items-center gap-1.5">
                <ClockCircleOutlined className="text-blue-500" />
                <span>
                  {formatTime(item.start_time)} - {formatTime(item.end_time)}
                </span>
              </div>
              <div className="text-gray-600 flex items-center gap-1.5">
                <HomeOutlined className="text-amber-500" />
                <span>{roomName || 'Chưa xếp phòng'}</span>
              </div>
              <div className="text-gray-600 flex items-center gap-1.5">
                <UserOutlined className="text-purple-500" />
                <span>{teacherName || 'Chưa xếp giảng viên'}</span>
              </div>
              <div className="mt-2 pt-2 border-t flex justify-between items-center">
                <Tag color={badgeColor}>
                  {isCancelled ? 'Đã hủy' : isAttended ? 'Đã điểm danh' : 'Chưa điểm danh'}
                </Tag>
                <Button
                  type="link"
                  size="small"
                  className="px-0 font-medium"
                  onClick={(e) => handleOpenSessionModal(item, e)}
                >
                  Xem chi tiết →
                </Button>
              </div>
            </div>
          );

          return (
            <Popover key={item.id} content={popoverContent} trigger="hover">
              <div
                onClick={(e) => handleOpenSessionModal(item, e)}
                className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-all border ${
                  isCancelled
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : isAttended
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <span className="font-semibold mr-1">{timeStr}</span>
                <span>{item.class?.name || 'Lớp học'}</span>
              </div>
            </Popover>
          );
        })}

        {remainingCount > 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setDayDrawerDate(date);
              setDayDrawerOpen(true);
            }}
            className="text-xs text-blue-600 font-medium hover:underline cursor-pointer text-center py-0.5"
          >
            +{remainingCount} buổi nữa...
          </div>
        )}
      </div>
    );
  };

  // Cấu hình bảng cho Table View
  const tableColumns = [
    {
      title: 'Ngày học',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (date: string) => (
        <div>
          <div className="font-semibold text-gray-800">{dayjs(date).format('DD/MM/YYYY')}</div>
          <div className="text-xs text-gray-500">{dayjs(date).format('dddd')}</div>
        </div>
      ),
    },
    {
      title: 'Khung giờ',
      key: 'time',
      width: 130,
      render: (_: any, row: ScheduleItem) => (
        <Space size={4} className="text-xs font-medium text-gray-700">
          <ClockCircleOutlined className="text-blue-500" />
          <span>
            {formatTime(row.start_time)} - {formatTime(row.end_time)}
          </span>
        </Space>
      ),
    },
    {
      title: 'Lớp học',
      key: 'class',
      render: (_: any, row: ScheduleItem) => (
        <div>
          <div
            className="font-semibold text-blue-600 hover:underline cursor-pointer"
            onClick={() => row.class_id && navigate(`/lms/classes/${row.class_id}`)}
          >
            {row.class?.name || 'Lớp học'}
          </div>
          {row.class?.course?.name && (
            <div className="text-xs text-gray-500">{row.class.course.name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Giảng viên',
      key: 'teacher',
      render: (_: any, row: ScheduleItem) => {
        const teacherName = row.teacher?.full_name || row.class?.teacher?.full_name;
        return teacherName ? (
          <Space size={4} className="text-xs text-gray-800">
            <UserOutlined className="text-purple-600" />
            <span>{teacherName}</span>
          </Space>
        ) : (
          <span className="text-xs text-gray-400 italic">Chưa phân công</span>
        );
      },
    },
    {
      title: 'Phòng học',
      key: 'room',
      render: (_: any, row: ScheduleItem) => {
        const roomName = row.room?.name || row.class?.room?.name;
        return roomName ? (
          <Tag color="cyan" className="font-medium">
            <HomeOutlined className="mr-1" />
            {roomName}
          </Tag>
        ) : (
          <span className="text-xs text-gray-400 italic">Chưa xếp</span>
        );
      },
    },
    {
      title: 'Điểm danh',
      key: 'attendance',
      width: 170,
      render: (_: any, row: ScheduleItem) => {
        const isAttended = row.attendances && row.attendances.length > 0;
        const isOverdue = isScheduleOverdue(row);
        if (isAttended) {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Đã điểm danh ({row.attendances?.length})
            </Tag>
          );
        }
        if (isOverdue) {
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              Quá hạn điểm danh
            </Tag>
          );
        }
        return <Tag color="default">Chưa điểm danh</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        if (status === 'cancelled') return <Tag color="red">Đã hủy</Tag>;
        if (status === 'completed') return <Tag color="blue">Đã kết thúc</Tag>;
        return <Tag color="processing">Lên lịch</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      render: (_: any, row: ScheduleItem) => {
        const isAttended = row.attendances && row.attendances.length > 0;
        const isOverdue = isScheduleOverdue(row);
        return (
          <Space size="small">
            <Button
              size="small"
              type="primary"
              onClick={() => navigate(`/lms/sessions/${row.id}`)}
            >
              Điểm danh
            </Button>
            {!isAttended && row.status !== 'cancelled' && (
              <Tooltip title={isOverdue ? 'Quá giờ dạy nhưng chưa điểm danh. Nhấn để gửi thông báo nhắc giảng viên ngay' : 'Gửi thông báo nhắc giảng viên điểm danh'}>
                <Button
                  size="small"
                  danger={isOverdue}
                  icon={<BellOutlined />}
                  loading={remindingId === row.id}
                  onClick={(e) => handleRemindSession(row, e)}
                >
                  Nhắc GV
                </Button>
              </Tooltip>
            )}
            <Button size="small" onClick={() => handleOpenSessionModal(row)}>
              Chi tiết
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lịch học tổng thể (Master Schedule)"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lịch học' },
        ]}
        actions={
          <Space>
            <Button
              icon={<SyncOutlined spin={loading} />}
              onClick={fetchSchedules}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => navigate('/lms/scheduling')}
            >
              Xếp lớp & Giảng viên
            </Button>
          </Space>
        }
      />

      {/* THỐNG KÊ NHANH */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl">
            <Statistic
              title={<span className="text-gray-500 font-medium">Tổng số buổi học</span>}
              value={stats.total}
              prefix={<BookOutlined className="text-blue-500 mr-1" />}
              suffix={<span className="text-xs text-gray-400">buổi</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl">
            <Statistic
              title={<span className="text-gray-500 font-medium">Buổi học hôm nay</span>}
              value={stats.todayCount}
              prefix={<CalendarOutlined className="text-amber-500 mr-1" />}
              valueStyle={{ color: '#d97706' }}
              suffix={<span className="text-xs text-gray-400">buổi</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl">
            <Statistic
              title={<span className="text-gray-500 font-medium">Đã điểm danh</span>}
              value={stats.attended}
              prefix={<CheckCircleOutlined className="text-emerald-500 mr-1" />}
              valueStyle={{ color: '#059669' }}
              suffix={
                <span className="text-xs text-gray-400">
                  ({stats.attendedRate}%)
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl">
            <Statistic
              title={<span className="text-gray-500 font-medium">{stats.overdueCount > 0 ? '⚠️ Quá hạn điểm danh' : 'Lớp đang có lịch'}</span>}
              value={stats.overdueCount > 0 ? stats.overdueCount : stats.activeClasses}
              prefix={stats.overdueCount > 0 ? <AlertOutlined className="text-red-500 mr-1" /> : <HomeOutlined className="text-purple-500 mr-1" />}
              valueStyle={{ color: stats.overdueCount > 0 ? '#dc2626' : undefined }}
              suffix={<span className="text-xs text-gray-400">{stats.overdueCount > 0 ? 'buổi' : 'lớp'}</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* CẢNH BÁO CA HỌC QUÁ HẠN CHƯA ĐIỂM DANH */}
      {totalOverdueAcrossAll > 0 && (
        <Alert
          message={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertOutlined className="text-red-500 text-base" />
                <span className="text-gray-800 text-sm">
                  Phát hiện <strong className="text-red-600 font-bold">{totalOverdueAcrossAll}</strong> buổi học đã kết thúc nhưng giảng viên chưa thực hiện điểm danh.
                </span>
              </div>
              <Space>
                <Button
                  size="small"
                  onClick={() => setSelectedStatus('overdue')}
                >
                  Lọc danh sách ca trễ
                </Button>
                <Popconfirm
                  title="Gửi thông báo nhắc nhở giảng viên?"
                  description={`Hệ thống sẽ gửi thông báo đẩy đến tất cả giảng viên phụ trách ${totalOverdueAcrossAll} buổi học quá hạn chưa điểm danh.`}
                  onConfirm={handleRemindAllOverdue}
                  okText="Gửi nhắc ngay"
                  cancelText="Hủy"
                >
                  <Button
                    size="small"
                    type="primary"
                    danger
                    icon={<BellOutlined />}
                    loading={remindingAll}
                  >
                    Nhắc tất cả ca trễ
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          }
          type="warning"
          showIcon={false}
          className="border-amber-300 bg-amber-50/90 rounded-xl"
        />
      )}

      {/* THANH BỘ LỌC VÀ CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
      <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Bộ lọc linh hoạt */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterOutlined className="text-gray-400" />

            {/* Lớp */}
            <Select
              allowClear
              showSearch
              placeholder="Tất cả lớp học"
              style={{ width: 200 }}
              value={selectedClassId}
              onChange={setSelectedClassId}
              optionFilterProp="label"
              options={classesList.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />

            {/* Giảng viên */}
            <Select
              allowClear
              showSearch
              placeholder="Tất cả giảng viên"
              style={{ width: 190 }}
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              optionFilterProp="label"
              options={teachersList.map((t) => ({
                label: t.full_name,
                value: t.id,
              }))}
            />

            {/* Phòng */}
            <Select
              allowClear
              showSearch
              placeholder="Tất cả phòng"
              style={{ width: 160 }}
              value={selectedRoomId}
              onChange={setSelectedRoomId}
              optionFilterProp="label"
              options={roomsList.map((r) => ({
                label: r.name,
                value: r.id,
              }))}
            />

            {/* Trạng thái điểm danh */}
            <Select
              allowClear
              placeholder="Trạng thái điểm danh"
              style={{ width: 200 }}
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { label: 'Đã điểm danh', value: 'attended' },
                { label: 'Chưa điểm danh', value: 'unattended' },
                { label: `⚠️ Quá hạn điểm danh (${totalOverdueAcrossAll})`, value: 'overdue' },
                { label: 'Đã hủy', value: 'cancelled' },
              ]}
            />

            {/* Bộ lọc ngày khi xem bảng */}
            {viewMode === 'table' && (
              <DatePicker.RangePicker
                value={dateRange as any}
                onChange={(dates) => setDateRange(dates as any)}
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                style={{ width: 240 }}
              />
            )}

            {(selectedClassId || selectedTeacherId || selectedRoomId || selectedStatus || dateRange) && (
              <Button type="link" size="small" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {/* Switcher Calendar / Table */}
          <div className="flex items-center gap-2">
            {viewMode === 'calendar' && (
              <Button
                size="middle"
                onClick={() => setCalendarDate(dayjs())}
              >
                Hôm nay
              </Button>
            )}

            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'calendar' | 'table')}
              options={[
                {
                  label: 'Lịch biểu',
                  value: 'calendar',
                  icon: <AppstoreOutlined />,
                },
                {
                  label: 'Danh sách bảng',
                  value: 'table',
                  icon: <UnorderedListOutlined />,
                },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* NỘI DUNG CHÍNH (CALENDAR HOẶC TABLE) */}
      {loading ? (
        <Card className="flex justify-center items-center py-20 rounded-xl">
          <Spin size="large" tip="Đang tải lịch học..." />
        </Card>
      ) : viewMode === 'calendar' ? (
        <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl overflow-hidden p-2">
          <Calendar
            value={calendarDate}
            onChange={setCalendarDate}
            onSelect={handleDateSelect}
            cellRender={dateCellRender}
          />
        </Card>
      ) : (
        <Card bordered={false} className="shadow-sm border border-gray-100 rounded-xl">
          <Table
            rowKey="id"
            dataSource={filteredSchedules}
            columns={tableColumns}
            pagination={{ pageSize: 15, showTotal: (t) => `Tổng cộng ${t} buổi học` }}
            locale={{ emptyText: <Empty description="Không có buổi học nào phù hợp với bộ lọc" /> }}
          />
        </Card>
      )}

      {/* DRAWER DANH SÁCH BUỔI HỌC TRONG NGÀY (KHI CLICK NGÀY TRÊN CALENDAR) */}
      <Drawer
        title={
          dayDrawerDate ? (
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-blue-500" />
              <span>Lịch học ngày {dayDrawerDate.format('DD/MM/YYYY (dddd)')}</span>
            </div>
          ) : (
            'Buổi học trong ngày'
          )
        }
        open={dayDrawerOpen}
        onClose={() => setDayDrawerOpen(false)}
        width={480}
      >
        {dayDrawerDate && (
          <div className="space-y-4">
            {getDaySessions(dayDrawerDate).length === 0 ? (
              <Empty description="Không có buổi học nào trong ngày này" />
            ) : (
              getDaySessions(dayDrawerDate).map((session) => {
                const isAttended = session.attendances && session.attendances.length > 0;
                return (
                  <Card
                    key={session.id}
                    hoverable
                    className="border border-gray-200 rounded-xl shadow-xs"
                    onClick={() => handleOpenSessionModal(session)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-base text-gray-900">
                        {session.class?.name || 'Buổi học'}
                      </div>
                      <Tag color={isAttended ? 'green' : 'blue'}>
                        {isAttended ? 'Đã điểm danh' : 'Chưa điểm danh'}
                      </Tag>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-blue-500" />
                        <span>
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HomeOutlined className="text-amber-500" />
                        <span>{session.room?.name || session.class?.room?.name || 'Chưa xếp phòng'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserOutlined className="text-purple-500" />
                        <span>
                          {session.teacher?.full_name || session.class?.teacher?.full_name || 'Chưa xếp giảng viên'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      {!isAttended && session.status !== 'cancelled' && (
                        <Button
                          size="small"
                          danger={isScheduleOverdue(session)}
                          icon={<BellOutlined />}
                          loading={remindingId === session.id}
                          onClick={(e) => handleRemindSession(session, e)}
                        >
                          Nhắc GV
                        </Button>
                      )}
                      <Button
                        size="small"
                        type="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lms/sessions/${session.id}`);
                        }}
                      >
                        Vào điểm danh
                      </Button>
                      <Button size="small">Chi tiết</Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </Drawer>

      {/* MODAL CHI TIẾT BUỔI HỌC */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BookOutlined className="text-blue-500" />
            <span>Chi tiết buổi học</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>
            Đóng
          </Button>,
          selectedSession && (!selectedSession.attendances || selectedSession.attendances.length === 0) && selectedSession.status !== 'cancelled' && (
            <Button
              key="remind"
              danger={isScheduleOverdue(selectedSession)}
              icon={<BellOutlined />}
              loading={remindingId === selectedSession.id}
              onClick={() => handleRemindSession(selectedSession)}
            >
              Nhắc GV điểm danh
            </Button>
          ),
          selectedSession && (
            <Button
              key="detail"
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => {
                navigate(`/lms/sessions/${selectedSession.id}`);
              }}
            >
              Trang Điểm danh & Chi tiết
            </Button>
          ),
        ]}
        width={560}
      >
        {selectedSession && (
          <div className="space-y-4 py-2">
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-900 m-0">
                  {selectedSession.class?.name || 'Buổi học'}
                </h3>
                {selectedSession.class?.course?.name && (
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    Khóa học: {selectedSession.class.course.name}
                  </p>
                )}
              </div>
              <Tag
                color={
                  selectedSession.status === 'cancelled'
                    ? 'red'
                    : selectedSession.attendances && selectedSession.attendances.length > 0
                    ? 'green'
                    : 'blue'
                }
              >
                {selectedSession.status === 'cancelled'
                  ? 'Đã hủy'
                  : selectedSession.attendances && selectedSession.attendances.length > 0
                  ? 'Đã điểm danh'
                  : 'Lên lịch'}
              </Tag>
            </div>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <CalendarOutlined /> Ngày học
                  </div>
                  <div className="font-semibold text-gray-800">
                    {dayjs(selectedSession.date).format('DD/MM/YYYY (dddd)')}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <ClockCircleOutlined /> Khung giờ
                  </div>
                  <div className="font-semibold text-gray-800">
                    {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <HomeOutlined /> Phòng học
                  </div>
                  <div className="font-semibold text-gray-800">
                    {selectedSession.room?.name || selectedSession.class?.room?.name || (
                      <span className="text-gray-400 italic">Chưa phân phòng</span>
                    )}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <UserOutlined /> Giảng viên phụ trách
                  </div>
                  <div className="font-semibold text-gray-800">
                    {selectedSession.teacher?.full_name ||
                      selectedSession.class?.teacher?.full_name || (
                        <span className="text-gray-400 italic">Chưa phân công</span>
                      )}
                  </div>
                </div>
              </Col>
            </Row>

            <Divider className="my-2" />

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <CheckCircleOutlined className="text-emerald-500" />
                <span>Tình trạng điểm danh:</span>
              </div>
              {selectedSession.attendances && selectedSession.attendances.length > 0 ? (
                <div className="flex gap-2">
                  <Tag color="green">
                    Có mặt: {selectedSession.attendances.filter((a) => a.status === 'present').length}
                  </Tag>
                  <Tag color="orange">
                    Đi muộn: {selectedSession.attendances.filter((a) => a.status === 'late').length}
                  </Tag>
                  <Tag color="red">
                    Vắng: {selectedSession.attendances.filter((a) => a.status === 'absent').length}
                  </Tag>
                  <Tag color="blue">
                    Có phép: {selectedSession.attendances.filter((a) => a.status === 'excused').length}
                  </Tag>
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-center gap-2">
                  <ExclamationCircleOutlined className="text-amber-500" />
                  <span>Buổi học này chưa được giảng viên ghi nhận điểm danh.</span>
                </div>
              )}
            </div>

            {selectedSession.notes && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">
                  Nội dung bài học / Ghi chú:
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 whitespace-pre-wrap">
                  {selectedSession.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
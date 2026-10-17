import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Calendar,
  Card,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { useAuth } from '../../shared/contexts/AuthContext';
import { classService } from '../../services/api/class.service';
import { scheduleService } from '../../services/api/schedule.service';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

type ViewType = 'list' | 'calendar';

interface MyClass {
  id: number;
  name: string;
  start_date?: string | Date;
  end_date?: string | Date;
  schedule_days?: any;
  schedule_time?: any;
  schedule?: string;
  room?: string;
  students?: number;
  status?: string;
}

interface MySession {
  id: number;
  classId?: number;
  className: string;
  date: string | Date;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  room?: string;
  status: string;
  attendances?: any[];
}

const getArrayData = (res: any) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.classes)) return res.classes;
  if (Array.isArray(res?.schedules)) return res.schedules;
  return [];
};

const formatTime = (value?: string | Date | null) => {
  if (!value) return '';

  const text = String(value).trim();

  // ISO datetime match: 2026-10-14T09:00:00 or similar
  const isoMatch = text.match(/T(\d{2}:\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Already HH:mm format
  if (/^\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 5);
  }

  return text;
};

const DAY_LABELS: Record<string, string> = {
  '0': 'Chủ nhật',
  '1': 'Thứ 2',
  '2': 'Thứ 3',
  '3': 'Thứ 4',
  '4': 'Thứ 5',
  '5': 'Thứ 6',
  '6': 'Thứ 7',
  'Sun': 'Chủ nhật',
  'Mon': 'Thứ 2',
  'Tue': 'Thứ 3',
  'Wed': 'Thứ 4',
  'Thu': 'Thứ 5',
  'Fri': 'Thứ 6',
  'Sat': 'Thứ 7',
  'CN': 'Chủ nhật',
};

const getDayWeight = (d: any) => {
  const num = Number(d);
  if (!isNaN(num)) {
    return num === 0 ? 7 : num;
  }
  const weightMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
    'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6,
    CN: 7, 'Chủ nhật': 7,
  };
  return weightMap[String(d).trim()] || 99;
};

const parseScheduleDaysText = (val: any): string => {
  if (!val) return '';
  let arr: any[] = [];

  if (Array.isArray(val)) {
    arr = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        arr = JSON.parse(trimmed);
      } catch {
        arr = trimmed.slice(1, -1).split(',');
      }
    } else {
      arr = trimmed.split(',');
    }
  }

  if (!Array.isArray(arr) || arr.length === 0) return '';

  const labels = arr
    .map((item) => String(item).trim().replace(/['"]/g, ''))
    .filter(Boolean)
    .sort((a, b) => getDayWeight(a) - getDayWeight(b))
    .map((item) => DAY_LABELS[item] || (item.startsWith('Thứ') || item === 'Chủ nhật' ? item : `Thứ ${item}`));

  return Array.from(new Set(labels)).join(', ');
};

const parseScheduleTimeText = (val: any): string => {
  if (!val) return '';
  let times: string[] = [];

  if (Array.isArray(val)) {
    times = val.map((t) => formatTime(t)).filter(Boolean);
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          times = parsed.map((t) => formatTime(t)).filter(Boolean);
        }
      } catch {
        // Fallback to regex
      }
    }

    if (times.length === 0) {
      const matches = trimmed.match(/\d{1,2}:\d{2}/g);
      if (matches) {
        times = matches.slice(0, 2);
      }
    }
  }

  if (times.length >= 2) {
    return `${times[0]} - ${times[1]}`;
  }
  if (times.length === 1) {
    return times[0];
  }
  return typeof val === 'string' && !val.includes('[') ? val : '';
};

export const formatClassSchedule = (classItem: any) => {
  let daysRaw = classItem.schedule_days;
  let timeRaw = classItem.schedule_time;

  // Handle case where schedule is saved as "[1,4]: [\"09:00\", \"10:30\"]" or similar combined string
  if ((!daysRaw || !timeRaw) && typeof classItem.schedule === 'string') {
    const parts = classItem.schedule.split(':');
    if (parts.length >= 2 && parts[0].includes('[') && parts[1].includes('[')) {
      if (!daysRaw) daysRaw = parts[0].trim();
      if (!timeRaw) timeRaw = parts.slice(1).join(':').trim();
    } else if (!daysRaw) {
      daysRaw = classItem.schedule;
    }
  }

  const daysText = parseScheduleDaysText(daysRaw);
  const timeText = parseScheduleTimeText(timeRaw);

  return { daysText, timeText };
};

const CLASS_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  upcoming: { label: 'Sắp khai giảng', color: 'processing' },
  ongoing: { label: 'Đang diễn ra', color: 'success' },
  active: { label: 'Đang diễn ra', color: 'success' },
  completed: { label: 'Đã kết thúc', color: 'default' },
  cancelled: { label: 'Đã hủy', color: 'error' },
  paused: { label: 'Tạm dừng', color: 'warning' },
};

const computeClassStatus = (cls: MyClass): string => {
  // Nếu đã bị hủy thủ công thì ưu tiên giữ nguyên
  if (cls.status === 'cancelled') return 'cancelled';

  const today = dayjs().startOf('day');
  const startDate = cls.start_date ? dayjs(cls.start_date).startOf('day') : null;
  const endDate = cls.end_date ? dayjs(cls.end_date).endOf('day') : null;

  if (startDate && startDate.isValid()) {
    if (today.isBefore(startDate)) {
      return 'upcoming'; // Chưa tới ngày khai giảng
    }
    if (endDate && endDate.isValid() && today.isAfter(endDate)) {
      return 'completed'; // Đã qua ngày kết thúc
    }
    return 'ongoing'; // Đã tới/qua ngày khai giảng -> Đang diễn ra
  }

  return cls.status || 'ongoing';
};

export function MySchedulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const [viewType, setViewType] = useState<ViewType>('list');
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dayDetailVisible, setDayDetailVisible] = useState(false);
  const [selectedDaySessions, setSelectedDaySessions] = useState<MySession[]>([]);

  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  useEffect(() => {
    fetchMyScheduleData();
  }, []);

  const fetchMyScheduleData = async () => {
    try {
      setLoading(true);

      const [classRes, scheduleRes] = await Promise.all([
        classService.getMyClasses
          ? classService.getMyClasses()
          : classService.getAll({ limit: 100 }),
        scheduleService.getMySchedules
          ? scheduleService.getMySchedules()
          : scheduleService.getAll(),
      ]);

      const classList = getArrayData(classRes).map((item: any) => ({
        id: item.id,
        name: item.name,
        start_date: item.start_date,
        end_date: item.end_date,
        schedule_days: item.schedule_days,
        schedule_time: item.schedule_time,
        schedule: item.schedule,
        room: item.room?.name || item.room_name || item.room || '-',
        students:
          item.students_count ||
          item.student_count ||
          item.classEnrollments?.length ||
          item.enrollments?.length ||
          0,
        status: item.status,
      }));

      const sessionList = getArrayData(scheduleRes).map((item: any) => {
        const hasAttendance =
          Array.isArray(item.attendances) && item.attendances.length > 0;

        return {
          id: item.id,
          classId: item.class_id || item.classId || item.class?.id,
          className: item.class?.name || item.className || item.class_name || '-',
          date: item.date,
          startTime: item.start_time || item.startTime,
          endTime: item.end_time || item.endTime,
          room: item.room?.name || item.room_name || item.room || '-',
          status: hasAttendance ? 'attended' : item.status || 'scheduled',
          attendances: item.attendances || [],
        };
      });

      setClasses(classList);
      setSessions(sessionList);
    } catch (error: any) {
      message.error(error.message || 'Lỗi tải lịch học');
    } finally {
      setLoading(false);
    }
  };

  const todaySessions = useMemo(() => {
    return sessions.filter((session) => dayjs(session.date).isSame(dayjs(), 'day'));
  }, [sessions]);

  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        const sessionDate = dayjs(session.date);
        return sessionDate.isSame(dayjs(), 'day') || sessionDate.isAfter(dayjs(), 'day');
      })
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [sessions]);

  const nextSession = upcomingSessions[0];

  const weeklyHours = useMemo(() => {
    return sessions
      .filter((session) => dayjs(session.date).isSame(dayjs(), 'week'))
      .reduce((total, session) => {
        const start = dayjs(session.startTime);
        const end = dayjs(session.endTime);

        if (!start.isValid() || !end.isValid()) return total;

        return total + Math.max(end.diff(start, 'hour', true), 0);
      }, 0);
  }, [sessions]);

  const getListData = (value: Dayjs) => {
    return sessions
      .filter((session) => dayjs(session.date).isSame(value, 'day'))
      .map((session) => ({
        type:
          session.status === 'attended' || session.status === 'completed'
            ? 'success'
            : 'processing',
        content: `${formatTime(session.startTime)} - ${session.className}`,
      }));
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);

    return (
      <ul className="events">
        {listData.map((item, index) => (
          <li key={index}>
            <Badge status={item.type as any} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);

    const daySessions = sessions.filter((session) =>
      dayjs(session.date).isSame(date, 'day')
    );

    if (daySessions.length > 0) {
      setSelectedDaySessions(daySessions);
      setDayDetailVisible(true);
    }
  };

  const openClassDetail = (classId?: number) => {
    if (!classId) {
      message.warning('Không tìm thấy lớp học');
      return;
    }

    navigate(`/lms/classes/${classId}`);
  };

  const openSessionDetail = (sessionId: number) => {
    navigate(`/lms/sessions/${sessionId}`);
  };

  const renderSessionStatus = (status: string) => {
    if (status === 'attended') {
      return <Tag color="success">Đã điểm danh</Tag>;
    }

    if (status === 'completed') {
      return <Tag color="cyan">Đã hoàn thành</Tag>;
    }

    if (status === 'cancelled') {
      return <Tag color="error">Đã hủy</Tag>;
    }

    return <Tag color="processing">Chưa điểm danh</Tag>;
  };

  const classColumns: ColumnsType<MyClass> = [
    {
      title: 'Lớp học',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Button
          type="link"
          className="p-0 font-medium text-blue-600 hover:text-blue-800"
          onClick={() => openClassDetail(record.id)}
        >
          {name}
        </Button>
      ),
    },
    {
      title: 'Lịch học',
      key: 'schedule',
      render: (_, record) => {
        const { daysText, timeText } = formatClassSchedule(record);
        if (!daysText && !timeText) {
          return <span className="text-gray-400 italic">Chưa có lịch</span>;
        }

        return (
          <div className="flex flex-col gap-1 py-1">
            {daysText ? (
              <div className="flex items-center gap-1.5 font-medium text-gray-800">
                <CalendarOutlined className="text-blue-500 text-xs" />
                <span>{daysText}</span>
              </div>
            ) : null}
            {timeText ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ClockCircleOutlined className="text-gray-400 text-xs" />
                <span>{timeText}</span>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Phòng',
      dataIndex: 'room',
      key: 'room',
      render: (room?: string) => (
        <Space>
          <EnvironmentOutlined className="text-gray-400" />
          <span>{room || '-'}</span>
        </Space>
      ),
    },
    ...(isTeacher
      ? [
        {
          title: 'Số học viên',
          dataIndex: 'students',
          key: 'students',
          render: (students: number) => `${students || 0} học viên`,
        },
      ]
      : []),
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const actualStatus = computeClassStatus(record);
        const config = CLASS_STATUS_CONFIG[actualStatus] || {
          label: 'Đang diễn ra',
          color: 'success',
        };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openClassDetail(record.id)}>
          Chi tiết lớp
        </Button>
      ),
    },
  ];

  const sessionColumns: ColumnsType<MySession> = [
    {
      title: 'Lớp học',
      dataIndex: 'className',
      key: 'className',
      render: (className: string, record) => (
        <Button type="link" onClick={() => openClassDetail(record.classId)}>
          {className}
        </Button>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date: string | Date) => {
        const d = dayjs(date);
        const isToday = d.isSame(dayjs(), 'day');
        return (
          <Space>
            <CalendarOutlined className={isToday ? 'text-green-500' : 'text-blue-500'} />
            <span className={`capitalize ${isToday ? 'font-semibold text-green-700' : 'text-gray-800'}`}>
              {d.format('dddd, DD/MM/YYYY')}
            </span>
            {isToday && <Tag color="green">Hôm nay</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => {
        const sTime = formatTime(record.startTime);
        const eTime = formatTime(record.endTime);
        const timeStr = sTime && eTime ? `${sTime} - ${eTime}` : sTime || eTime || 'Chưa có giờ';
        return (
          <Space>
            <ClockCircleOutlined className="text-gray-400" />
            <span className="font-medium text-gray-700">{timeStr}</span>
          </Space>
        );
      },
    },
    {
      title: 'Phòng',
      dataIndex: 'room',
      key: 'room',
      render: (room?: string) => (
        <Space>
          <EnvironmentOutlined />
          {room || '-'}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderSessionStatus(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {isTeacher && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => openSessionDetail(record.id)}
            >
              Điểm danh
            </Button>
          )}

          <Button type="link" size="small" onClick={() => openSessionDetail(record.id)}>
            Chi tiết buổi học
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isTeacher ? 'Lịch dạy của tôi' : 'Lịch học của tôi'}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: isTeacher ? 'Lịch dạy' : 'Lịch học' },
        ]}
        actions={
          <Space>
            <Select
              value={viewType}
              onChange={setViewType}
              style={{ width: 150 }}
              options={[
                { label: 'Dạng danh sách', value: 'list' },
                { label: 'Dạng lịch', value: 'calendar' },
              ]}
            />
          </Space>
        }
      />

      <Alert
        message={<span className="capitalize font-semibold">{`Hôm nay - ${dayjs().format('dddd, DD/MM/YYYY')}`}</span>}
        description={
          todaySessions.length > 0 ? (
            <div>
              <div className="font-medium text-blue-900 mb-2">Có {todaySessions.length} buổi học hôm nay:</div>
              <div className="mt-2 space-y-1.5">
                {todaySessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-2 text-sm">
                    <Tag color="blue" className="font-mono">
                      {formatTime(session.startTime)} - {formatTime(session.endTime)}
                    </Tag>
                    <span className="font-medium text-gray-800">{session.className}</span>
                    <span className="text-gray-500">({session.room || 'Chưa xếp phòng'})</span>
                    {renderSessionStatus(session.status)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <span className="text-gray-600">Không có buổi học hôm nay.</span>
              {nextSession && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-gray-700 font-medium">Buổi tiếp theo:</span>
                  <Tag color="cyan" className="capitalize">
                    {dayjs(nextSession.date).format('dddd, DD/MM/YYYY')}
                  </Tag>
                  <Tag color="blue" className="font-mono">
                    {formatTime(nextSession.startTime)} - {formatTime(nextSession.endTime)}
                  </Tag>
                  <span className="font-semibold text-blue-700">{nextSession.className}</span>
                  <span className="text-gray-500">({nextSession.room || 'Chưa xếp phòng'})</span>
                </div>
              )}
            </div>
          )
        }
        type="info"
        showIcon
        className="mb-6 shadow-sm border-blue-200"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
            <div className="text-gray-600 mt-1">
              {isTeacher ? 'Lớp đang dạy' : 'Lớp đang học'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {upcomingSessions.length}
            </div>
            <div className="text-gray-600 mt-1">Buổi sắp tới</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(weeklyHours)}h
            </div>
            <div className="text-gray-600 mt-1">
              {isTeacher ? 'Giờ dạy tuần này' : 'Giờ học tuần này'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {isTeacher
                ? classes.reduce((total, item) => total + (item.students || 0), 0)
                : sessions.filter((item) => item.status === 'completed').length}
            </div>
            <div className="text-gray-600 mt-1">
              {isTeacher ? 'Tổng học viên' : 'Buổi đã học'}
            </div>
          </div>
        </Card>
      </div>

      {viewType === 'list' ? (
        <div className="space-y-6">
          <Card title={isTeacher ? 'Lớp đang dạy' : 'Lớp đang học'}>
            <Table
              dataSource={classes}
              rowKey="id"
              pagination={false}
              columns={classColumns}
              locale={{
                emptyText: isTeacher
                  ? 'Chưa có lớp đang dạy'
                  : 'Chưa có lớp đang học',
              }}
            />
          </Card>

          <Card title={isTeacher ? 'Buổi dạy sắp tới' : 'Buổi học sắp tới'}>
            <Table
              dataSource={upcomingSessions}
              rowKey="id"
              pagination={false}
              columns={sessionColumns}
              locale={{ emptyText: 'Chưa có buổi học sắp tới' }}
            />
          </Card>
        </div>
      ) : (
        <Card title={isTeacher ? 'Lịch dạy dạng Calendar' : 'Lịch học dạng Calendar'}>
          <Calendar
            dateCellRender={dateCellRender}
            onSelect={(date) => handleDateSelect(date)}
          />
        </Card>
      )}

      <Modal
        title={`Chi tiết lịch - ${selectedDate.format('dddd, DD/MM/YYYY')}`}
        open={dayDetailVisible}
        onCancel={() => setDayDetailVisible(false)}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          {selectedDaySessions.map((session) => (
            <Card key={session.id} size="small">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{session.className}</h4>

                  <Space size="large" wrap>
                    <Space>
                      <ClockCircleOutlined />
                      <span>
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </span>
                    </Space>

                    <Space>
                      <EnvironmentOutlined />
                      <span>{session.room || '-'}</span>
                    </Space>

                    {renderSessionStatus(session.status)}
                  </Space>
                </div>

                <Space>
                  {isTeacher && (
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => {
                        setDayDetailVisible(false);
                        openSessionDetail(session.id);
                      }}
                    >
                      Điểm danh
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      setDayDetailVisible(false);
                      openSessionDetail(session.id);
                    }}
                  >
                    Chi tiết buổi học
                  </Button>

                  <Button
                    onClick={() => {
                      setDayDetailVisible(false);
                      openClassDetail(session.classId);
                    }}
                  >
                    Xem lớp học
                  </Button>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  );
}
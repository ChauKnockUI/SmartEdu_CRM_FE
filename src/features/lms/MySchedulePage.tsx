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
  if (!value) return 'N/A';

  const text = String(value);

  // ISO datetime
  const isoMatch = text.match(/T(\d{2}:\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  if (/^\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 5);
  }

  return text;
};

const formatSchedule = (classItem: any) => {
  if (classItem.schedule) return classItem.schedule;

  const days = classItem.schedule_days;
  const time = classItem.schedule_time;

  let daysText = '';

  if (Array.isArray(days)) {
    daysText = days.join(', ');
  } else if (typeof days === 'string') {
    daysText = days;
  }

  let timeText = '';

  if (Array.isArray(time)) {
    timeText = time.join(' - ');
  } else if (typeof time === 'string') {
    timeText = time;
  }

  if (!daysText && !timeText) return '-';
  return `${daysText}${daysText && timeText ? ': ' : ''}${timeText}`;
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
        schedule: formatSchedule(item),
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
      return <Tag color="green">Đã điểm danh</Tag>;
    }

    if (status === 'completed') {
      return <Tag color="green">Đã hoàn thành</Tag>;
    }

    return <Tag color="blue">Chưa điểm danh</Tag>;
  };

  const classColumns: ColumnsType<MyClass> = [
    {
      title: 'Lớp học',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Button type="link" onClick={() => openClassDetail(record.id)}>
          {name}
        </Button>
      ),
    },
    {
      title: 'Lịch học',
      dataIndex: 'schedule',
      key: 'schedule',
      render: (schedule?: string) => schedule || '-',
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
      dataIndex: 'status',
      key: 'status',
      render: (status?: string) => (
        <Tag color={status === 'active' || status === 'ongoing' ? 'green' : 'blue'}>
          {status || 'active'}
        </Tag>
      ),
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
      render: (date: string | Date) => (
        <Space>
          <CalendarOutlined />
          {dayjs(date).format('dddd, DD/MM/YYYY')}
        </Space>
      ),
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined />
          {formatTime(record.startTime)} - {formatTime(record.endTime)}
        </Space>
      ),
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
        message={`Hôm nay - ${dayjs().format('dddd, DD/MM/YYYY')}`}
        description={
          todaySessions.length > 0 ? (
            <div>
              <strong>Có {todaySessions.length} buổi học hôm nay</strong>
              <div className="mt-2">
                {todaySessions.map((session) => (
                  <div key={session.id}>
                    {formatTime(session.startTime)} - {session.className}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <strong>Không có buổi học hôm nay</strong>
              {nextSession && (
                <div className="mt-2">
                  Buổi học tiếp theo: {dayjs(nextSession.date).format('dddd, DD/MM/YYYY')} -{' '}
                  {nextSession.className} ({formatTime(nextSession.startTime)} -{' '}
                  {formatTime(nextSession.endTime)})
                </div>
              )}
            </div>
          )
        }
        type="info"
        showIcon
        className="mb-6"
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
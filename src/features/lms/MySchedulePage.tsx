import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Calendar, Badge, Select, Alert, Modal } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useNavigate } from 'react-router';
import { useAuth } from '../../shared/contexts/AuthContext';
import { mockClasses, mockSessions } from '../../services/mock/mockData';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

// Mock data for teacher's classes
const teacherClasses = [
  { id: 'c1', name: 'IELTS Foundation', schedule: 'T2-4-6: 19:00-21:00', room: 'P301', students: 12 },
  { id: 'c2', name: 'IELTS Intensive', schedule: 'T3-5: 18:00-20:00', room: 'P302', students: 8 },
];

// Mock upcoming sessions for teacher
const upcomingSessions = [
  {
    id: 'sess1',
    classId: 'c1',
    className: 'IELTS Foundation',
    date: new Date(2026, 3, 7), // April 7, 2026 (Monday)
    startTime: '19:00',
    endTime: '21:00',
    room: 'P301',
    status: 'scheduled',
  },
  {
    id: 'sess2',
    classId: 'c2',
    className: 'IELTS Intensive',
    date: new Date(2026, 3, 8), // April 8, 2026 (Tuesday)
    startTime: '18:00',
    endTime: '20:00',
    room: 'P302',
    status: 'scheduled',
  },
  {
    id: 'sess3',
    classId: 'c1',
    className: 'IELTS Foundation',
    date: new Date(2026, 3, 9), // April 9, 2026 (Wednesday)
    startTime: '19:00',
    endTime: '21:00',
    room: 'P301',
    status: 'scheduled',
  },
];

export function MySchedulePage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [viewType, setViewType] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dayDetailVisible, setDayDetailVisible] = useState(false);
  const [selectedDaySessions, setSelectedDaySessions] = useState<any[]>([]);

  const isTeacher = role === 'teacher';

  // Get list data based on role
  const getListData = (value: Dayjs) => {
    const sessions = upcomingSessions.filter(s => {
      const sessionDate = dayjs(s.date);
      return sessionDate.isSame(value, 'day');
    });

    return sessions.map(s => ({
      type: s.status === 'completed' ? 'success' : 'warning',
      content: `${s.startTime} - ${s.className}`,
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
    const sessions = upcomingSessions.filter(s => {
      const sessionDate = dayjs(s.date);
      return sessionDate.isSame(date, 'day');
    });
    
    if (sessions.length > 0) {
      setSelectedDaySessions(sessions);
      setDayDetailVisible(true);
    }
  };

  const handleAttendance = (sessionId: string) => {
    // Navigate to class detail to do attendance
    const session = upcomingSessions.find(s => s.id === sessionId);
    if (session) {
      navigate(`/lms/classes/${session.classId}`);
    }
  };

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
                { label: 'Dạng danh sách', value: 'list', icon: <ClockCircleOutlined /> },
                { label: 'Dạng lịch', value: 'calendar', icon: <CalendarOutlined /> },
              ]}
            />
          </Space>
        }
      />

      {/* Today's Alert */}
      <Alert
        message="Hôm nay - Thứ 2, 01/04/2026"
        description={
          <div>
            <strong>Không có buổi học hôm nay</strong>
            <div className="mt-2">Buổi học tiếp theo: Thứ 2, 07/04/2026 - IELTS Foundation (19:00-21:00)</div>
          </div>
        }
        type="info"
        showIcon
        className="mb-6"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {isTeacher ? teacherClasses.length : 3}
            </div>
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
            <div className="text-2xl font-bold text-orange-600">12h</div>
            <div className="text-gray-600 mt-1">Giờ dạy tuần này</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {isTeacher ? '20' : '1'}
            </div>
            <div className="text-gray-600 mt-1">
              {isTeacher ? 'Tổng học viên' : 'Buổi vắng'}
            </div>
          </div>
        </Card>
      </div>

      {viewType === 'list' ? (
        <div className="space-y-6">
          {/* My Classes */}
          <Card title={isTeacher ? 'Lớp đang dạy' : 'Lớp đang học'}>
            <Table
              dataSource={teacherClasses}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Lớp học',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name, record: any) => (
                    <Button
                      type="link"
                      onClick={() => navigate(`/lms/classes/${record.id}`)}
                    >
                      {name}
                    </Button>
                  ),
                },
                {
                  title: 'Lịch học',
                  dataIndex: 'schedule',
                  key: 'schedule',
                },
                {
                  title: 'Phòng',
                  dataIndex: 'room',
                  key: 'room',
                  render: (room) => (
                    <Space>
                      <EnvironmentOutlined />
                      {room}
                    </Space>
                  ),
                },
                ...(isTeacher ? [{
                  title: 'Số học viên',
                  dataIndex: 'students',
                  key: 'students',
                  render: (students: number) => `${students} học viên`,
                }] : []),
                {
                  title: 'Thao tác',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/lms/classes/${record.id}`)}
                      >
                        Chi tiết
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>

          {/* Upcoming Sessions */}
          <Card title="Buổi học sắp tới">
            <Table
              dataSource={upcomingSessions}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Lớp học',
                  dataIndex: 'className',
                  key: 'className',
                },
                {
                  title: 'Ngày',
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: Date) => (
                    <Space>
                      <CalendarOutlined />
                      {date.toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </Space>
                  ),
                },
                {
                  title: 'Thời gian',
                  key: 'time',
                  render: (_, record) => (
                    <Space>
                      <ClockCircleOutlined />
                      {record.startTime} - {record.endTime}
                    </Space>
                  ),
                },
                {
                  title: 'Phòng',
                  dataIndex: 'room',
                  key: 'room',
                  render: (room) => (
                    <Space>
                      <EnvironmentOutlined />
                      {room}
                    </Space>
                  ),
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'completed' ? 'green' : 'blue'}>
                      {status === 'completed' ? 'Đã hoàn thành' : 'Sắp diễn ra'}
                    </Tag>
                  ),
                },
                ...(isTeacher ? [{
                  title: 'Thao tác',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Space size="small">
                      {record.status === 'scheduled' && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleAttendance(record.id)}
                        >
                          Điểm danh
                        </Button>
                      )}
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/lms/sessions/${record.id}`)}
                      >
                        Chi tiết
                      </Button>
                    </Space>
                  ),
                }] : []),
              ]}
            />
          </Card>
        </div>
      ) : (
        <Card title="Lịch dạy dạng Calendar">
          <Calendar 
            dateCellRender={dateCellRender}
            onSelect={(date) => handleDateSelect(date)}
          />
        </Card>
      )}

      {/* Day Detail Modal */}
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
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{session.className}</h4>
                  <Space size="large">
                    <Space>
                      <ClockCircleOutlined />
                      <span>{session.startTime} - {session.endTime}</span>
                    </Space>
                    <Space>
                      <EnvironmentOutlined />
                      <span>{session.room}</span>
                    </Space>
                    <Tag color={session.status === 'completed' ? 'green' : 'blue'}>
                      {session.status === 'completed' ? 'Đã hoàn thành' : 'Sắp diễn ra'}
                    </Tag>
                  </Space>
                </div>
                <Space>
                  {isTeacher && session.status === 'scheduled' && (
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => {
                        setDayDetailVisible(false);
                        handleAttendance(session.id);
                      }}
                    >
                      Điểm danh
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setDayDetailVisible(false);
                      navigate(`/lms/classes/${session.classId}`);
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
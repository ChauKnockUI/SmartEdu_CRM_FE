import React, { useState } from 'react';
import { Table, Tag, Button, Space, Modal, Calendar, Badge, Card } from 'antd';
import { PlusOutlined, ExportOutlined, CalendarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockTeachers, teacherSchedules as mockTeacherSchedules } from '../../services/mock/mockData';
import type { Teacher } from '../../shared/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

// Teacher schedules - merged with mock data
const teacherSchedules: { [key: string]: any[] } = mockTeacherSchedules;

export function TeachersPage() {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const handleViewCalendar = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setCalendarVisible(true);
  };

  const getListData = (value: Dayjs, teacherId: string) => {
    const schedules = teacherSchedules[teacherId] || [];
    const sessions = schedules.filter(s => {
      const sessionDate = dayjs(s.date);
      return sessionDate.isSame(value, 'day');
    });

    return sessions.map(s => ({
      type: 'warning',
      content: `${s.time} - ${s.className}`,
    }));
  };

  const dateCellRender = (value: Dayjs) => {
    if (!selectedTeacher) return null;
    const listData = getListData(value, selectedTeacher.id);
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

  const columns: ColumnsType<Teacher> = [
    {
      title: 'Tên giảng viên',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Môn dạy',
      dataIndex: 'subjects',
      key: 'subjects',
      render: (subjects: string[]) => (
        <>
          {subjects.map(subject => (
            <Tag key={subject} color="blue">{subject}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: Teacher['status']) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (teacher: Teacher) => (
        <Space size="small">
          <Button type="link" size="small">
            Chi tiết
          </Button>
          <Button type="link" size="small" onClick={() => handleViewCalendar(teacher)}>
            Lịch dạy
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý Giảng viên"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Giảng viên' },
        ]}
        actions={
          <>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Thêm giảng viên
            </Button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Table
          columns={columns}
          dataSource={mockTeachers}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} giảng viên`,
          }}
        />
      </div>

      <Modal
        title={`Lịch dạy của ${selectedTeacher?.full_name}`}
        visible={calendarVisible}
        onCancel={() => setCalendarVisible(false)}
        footer={null}
        width="80%"
      >
        <Card>
          <Calendar
            dateCellRender={dateCellRender}
            headerRender={({ value, type, onChange, onTypeChange }) => (
              <div style={{ padding: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <Button
                    type="primary"
                    onClick={() => onTypeChange(type === 'year' ? 'month' : 'year')}
                  >
                    {type === 'year' ? 'Month' : 'Year'}
                  </Button>
                </div>
                <div>
                  <Button
                    type="link"
                    onClick={() => onChange(value.clone().add(-1, type))}
                  >
                    {'<'}
                  </Button>
                  <span style={{ margin: '0 8px' }}>
                    {value.format(type === 'year' ? 'YYYY' : 'YYYY-MM')}
                  </span>
                  <Button
                    type="link"
                    onClick={() => onChange(value.clone().add(1, type))}
                  >
                    {'>'}
                  </Button>
                </div>
              </div>
            )}
          />
        </Card>
      </Modal>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, Form, Select, Button, Space, Table, Tag, Alert, Modal, message, Divider } from 'antd';
import { WarningOutlined, CheckCircleOutlined, PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockClasses, mockTeachers, mockStudents } from '../../services/mock/mockData';

// Mock schedule data to check conflicts
const mockSchedules = [
  { id: 'sch1', personId: 't1', personName: 'Teacher A', classId: 'c1', className: 'IELTS Foundation', schedule: 'T2-4-6: 19:00-21:00' },
  { id: 'sch2', personId: 't2', personName: 'Teacher B', classId: 'c2', className: 'TOEIC Advanced', schedule: 'T3-5-7: 18:00-20:00' },
  { id: 'sch3', personId: 's1', personName: 'Nguyễn Văn A', classId: 'c1', className: 'IELTS Foundation', schedule: 'T2-4-6: 19:00-21:00' },
  { id: 'sch4', personId: 's2', personName: 'Trần Thị B', classId: 'c3', className: 'IELTS Intensive', schedule: 'T2-4-6: 14:00-16:00' },
];

// Helper function to check schedule conflict
const checkScheduleConflict = (personId: string, newSchedule: string) => {
  const existingSchedules = mockSchedules.filter(s => s.personId === personId);
  
  // Simple conflict detection based on schedule string
  // In real app, this would parse time slots and check overlaps
  const hasConflict = existingSchedules.some(s => {
    // Extract day patterns (T2-4-6, T3-5-7, etc.)
    const existingDays = s.schedule.split(':')[0];
    const newDays = newSchedule.split(':')[0];
    
    // Check if any days overlap
    const existingDayList = existingDays.match(/\d/g) || [];
    const newDayList = newDays.match(/\d/g) || [];
    
    return existingDayList.some(day => newDayList.includes(day));
  });
  
  return {
    hasConflict,
    conflicts: hasConflict ? existingSchedules : [],
  };
};

export function SchedulingPage() {
  const [form] = Form.useForm();
  const [assignType, setAssignType] = useState<'teacher' | 'student'>('teacher');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  const handlePersonChange = (personId: string) => {
    setSelectedPerson(personId);
    setConflicts([]);
    setShowConflictWarning(false);
  };

  const handleClassChange = (classId: string) => {
    const classItem = mockClasses.find(c => c.id === classId);
    setSelectedClass(classItem);
    
    if (selectedPerson && classItem) {
      // Check for conflicts
      const result = checkScheduleConflict(selectedPerson, classItem.schedule || '');
      if (result.hasConflict) {
        setConflicts(result.conflicts);
        setShowConflictWarning(true);
      } else {
        setConflicts([]);
        setShowConflictWarning(false);
      }
    }
  };

  const handleAssign = () => {
    const values = form.getFieldsValue();
    
    if (showConflictWarning) {
      Modal.confirm({
        title: 'Xác nhận xếp lớp có xung đột lịch',
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
        content: (
          <div>
            <p>Phát hiện trùng lịch học. Bạn có chắc chắn muốn tiếp tục?</p>
            <ul className="mt-2">
              {conflicts.map(c => (
                <li key={c.id}>• {c.className} - {c.schedule}</li>
              ))}
            </ul>
          </div>
        ),
        okText: 'Tiếp tục xếp lớp',
        cancelText: 'Hủy',
        onOk: () => {
          confirmAssign(values);
        },
      });
    } else {
      confirmAssign(values);
    }
  };

  const confirmAssign = (values: any) => {
    const personName = assignType === 'teacher' 
      ? mockTeachers.find(t => t.id === values.personId)?.name
      : mockStudents.find(s => s.id === values.personId)?.name;
    const className = mockClasses.find(c => c.id === values.classId)?.name;
    
    message.success(`Đã xếp ${personName} vào lớp ${className}`);
    form.resetFields();
    setSelectedPerson(null);
    setSelectedClass(null);
    setConflicts([]);
    setShowConflictWarning(false);
  };

  const currentSchedules = mockSchedules.filter(s => 
    assignType === 'teacher' ? s.personId.startsWith('t') : s.personId.startsWith('s')
  );

  return (
    <div>
      <PageHeader
        title="Xếp lịch học"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Xếp lịch học' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Form */}
        <Card title="Xếp lớp mới" extra={
          <Select
            value={assignType}
            onChange={setAssignType}
            style={{ width: 150 }}
            options={[
              { label: 'Giảng viên', value: 'teacher' },
              { label: 'Học viên', value: 'student' },
            ]}
          />
        }>
          <Form form={form} layout="vertical">
            <Form.Item
              name="personId"
              label={assignType === 'teacher' ? 'Chọn giảng viên' : 'Chọn học viên'}
              rules={[{ required: true, message: 'Vui lòng chọn' }]}
            >
              <Select
                showSearch
                placeholder={`Tìm ${assignType === 'teacher' ? 'giảng viên' : 'học viên'}...`}
                onChange={handlePersonChange}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={
                  assignType === 'teacher'
                    ? mockTeachers.map(t => ({ label: t.full_name, value: t.id }))
                    : mockStudents.map(s => ({ label: s.full_name, value: s.id }))
                }
              />
            </Form.Item>

            <Form.Item
              name="classId"
              label="Chọn lớp học"
              rules={[{ required: true, message: 'Vui lòng chọn lớp học' }]}
            >
              <Select
                showSearch
                placeholder="Tìm lớp học..."
                onChange={handleClassChange}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={mockClasses.map(c => ({
                  label: `${c.name} - ${c.schedule}`,
                  value: c.id,
                }))}
              />
            </Form.Item>

            {selectedClass && (
              <Alert
                message="Thông tin lớp học"
                description={
                  <div className="space-y-1">
                    <div><strong>Lớp:</strong> {selectedClass.name}</div>
                    <div><strong>Lịch:</strong> {selectedClass.schedule}</div>
                    <div><strong>Phòng:</strong> {selectedClass.room || 'Online'}</div>
                    <div><strong>Giảng viên:</strong> {selectedClass.teacherName}</div>
                  </div>
                }
                type="info"
                showIcon
                className="mb-4"
              />
            )}

            {showConflictWarning && (
              <Alert
                message="⚠️ Phát hiện trùng lịch học"
                description={
                  <div>
                    <p className="mb-2">Lịch học bị xung đột với:</p>
                    <ul className="list-disc pl-5">
                      {conflicts.map(c => (
                        <li key={c.id}>
                          <strong>{c.className}</strong> - {c.schedule}
                        </li>
                      ))}
                    </ul>
                  </div>
                }
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleAssign}
                  danger={showConflictWarning}
                >
                  {showConflictWarning ? 'Xếp lớp (có xung đột)' : 'Xếp lớp'}
                </Button>
                <Button onClick={() => {
                  form.resetFields();
                  setSelectedPerson(null);
                  setSelectedClass(null);
                  setConflicts([]);
                  setShowConflictWarning(false);
                }}>
                  Hủy
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Current Person Schedule */}
        <Card 
          title={`Lịch hiện tại - ${assignType === 'teacher' ? 'Giảng viên' : 'Học viên'}`}
        >
          {selectedPerson ? (
            <div>
              <Alert
                message={
                  assignType === 'teacher' 
                    ? mockTeachers.find(t => t.id === selectedPerson)?.full_name
                    : mockStudents.find(s => s.id === selectedPerson)?.full_name
                }
                description={`Danh sách lớp đang ${assignType === 'teacher' ? 'dạy' : 'học'}`}
                type="info"
                showIcon
                className="mb-4"
              />
              
              <Table
                dataSource={mockSchedules.filter(s => s.personId === selectedPerson)}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Lớp học',
                    dataIndex: 'className',
                    key: 'className',
                  },
                  {
                    title: 'Lịch học',
                    dataIndex: 'schedule',
                    key: 'schedule',
                  },
                  {
                    title: 'Thao tác',
                    key: 'action',
                    render: () => (
                      <Button type="link" size="small" danger>
                        Xóa
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Chọn {assignType === 'teacher' ? 'giảng viên' : 'học viên'} để xem lịch
            </div>
          )}
        </Card>
      </div>

      <Divider />

      {/* All Schedules Table */}
      <Card 
        title={`Tất cả lịch ${assignType === 'teacher' ? 'giảng dạy' : 'học tập'}`}
        extra={
          <Space>
            <Button icon={<CalendarOutlined />}>
              Xem lịch dạng calendar
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={currentSchedules}
          rowKey="id"
          columns={[
            {
              title: assignType === 'teacher' ? 'Giảng viên' : 'Học viên',
              dataIndex: 'personName',
              key: 'personName',
            },
            {
              title: 'Lớp học',
              dataIndex: 'className',
              key: 'className',
            },
            {
              title: 'Lịch học',
              dataIndex: 'schedule',
              key: 'schedule',
            },
            {
              title: 'Trạng thái',
              key: 'status',
              render: () => (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Đang hoạt động
                </Tag>
              ),
            },
            {
              title: 'Thao tác',
              key: 'action',
              render: (_, record) => (
                <Space size="small">
                  <Button type="link" size="small">
                    Chi tiết
                  </Button>
                  <Button type="link" size="small" danger>
                    Xóa khỏi lớp
                  </Button>
                </Space>
              ),
            },
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

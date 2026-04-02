import React, { useState } from 'react';
import { Card, Descriptions, Tag, Table, Button, Space, Modal, Form, Input, Select, Checkbox, message, Alert, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useNavigate } from 'react-router';
import { mockSessions } from '../../services/mock/mockData';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';

// Mock attendance data
const mockAttendance = [
  { id: '1', studentId: 's1', studentName: 'Nguyễn Văn A', status: 'present', note: '' },
  { id: '2', studentId: 's2', studentName: 'Trần Thị B', status: 'present', note: '' },
  { id: '3', studentId: 's3', studentName: 'Lê Văn C', status: 'late', note: 'Đến muộn 10 phút' },
  { id: '4', studentId: 's4', studentName: 'Phạm Thị D', status: 'absent', note: 'Báo nghỉ trước' },
];

export function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const permissions = usePermissions();
  const [attendance, setAttendance] = useState(mockAttendance);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

  const session = mockSessions.find(s => s.id === id);

  if (!session) {
    return <div>Buổi học không tồn tại</div>;
  }

  const handleSaveAttendance = () => {
    message.success('Đã lưu điểm danh');
    setEditMode(false);
  };

  const handleSaveNotes = (values: any) => {
    message.success('Đã lưu ghi chú buổi học');
    setNoteModalVisible(false);
    form.resetFields();
  };

  const handleAttendanceChange = (recordId: string, status: string) => {
    setAttendance(prev =>
      prev.map(item =>
        item.id === recordId ? { ...item, status } : item
      )
    );
  };

  const attendanceColumns: ColumnsType<typeof attendance[0]> = [
    {
      title: 'Học viên',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (name: string, record) => (
        role !== 'student' ? (
          <Button type="link" onClick={() => navigate(`/lms/students/${record.studentId}`)}>
            {name}
          </Button>
        ) : name
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        if (permissions.canTakeAttendance && editMode) {
          return (
            <Select
              value={status}
              style={{ width: 120 }}
              onChange={(value) => handleAttendanceChange(record.id, value)}
              options={[
                { label: 'Có mặt', value: 'present', icon: <CheckCircleOutlined /> },
                { label: 'Vắng', value: 'absent', icon: <CloseCircleOutlined /> },
                { label: 'Muộn', value: 'late', icon: <ClockCircleOutlined /> },
              ]}
            />
          );
        }

        if (status === 'present') {
          return <Tag icon={<CheckCircleOutlined />} color="success">Có mặt</Tag>;
        }
        if (status === 'absent') {
          return <Tag icon={<CloseCircleOutlined />} color="error">Vắng</Tag>;
        }
        if (status === 'late') {
          return <Tag icon={<ClockCircleOutlined />} color="warning">Muộn</Tag>;
        }
        return <Tag>{status}</Tag>;
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note: string, record) => {
        if (permissions.canTakeAttendance && editMode) {
          return (
            <Input
              value={note}
              placeholder="Nhập ghi chú..."
              onChange={(e) => {
                setAttendance(prev =>
                  prev.map(item =>
                    item.id === record.id ? { ...item, note: e.target.value } : item
                  )
                );
              }}
            />
          );
        }
        return note || '-';
      },
    },
  ];

  // Build action buttons based on role
  const buildActions = () => {
    const actions: React.ReactNode[] = [];

    if (permissions.canTakeAttendance && session.status === 'scheduled') {
      if (!editMode) {
        actions.push(
          <Button key="take-attendance" type="primary" icon={<CheckCircleOutlined />} onClick={() => setEditMode(true)}>
            Bắt đầu điểm danh
          </Button>
        );
      } else {
        actions.push(
          <Button key="save-attendance" type="primary" icon={<SaveOutlined />} onClick={handleSaveAttendance}>
            Lưu điểm danh
          </Button>,
          <Button key="cancel" onClick={() => setEditMode(false)}>
            Hủy
          </Button>
        );
      }
    }

    if (permissions.canEditSessionContent) {
      actions.push(
        <Button key="edit" icon={<EditOutlined />}>
          Chỉnh sửa buổi học
        </Button>
      );
    }

    if (role === 'teacher') {
      actions.push(
        <Button key="notes" icon={<FileTextOutlined />} onClick={() => setNoteModalVisible(true)}>
          Ghi chú bài giảng
        </Button>
      );
    }

    if (role === 'admin' && session.status === 'completed') {
      actions.push(
        <Button key="export" icon={<FileTextOutlined />}>
          Export điểm danh
        </Button>
      );
    }

    return <Space>{actions}</Space>;
  };

  return (
    <div>
      <PageHeader
        title={`Buổi ${session.id} - ${session.date.toLocaleDateString('vi-VN')}`}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lớp học', href: '/lms/classes' },
          { title: 'Chi tiết lớp', href: `/lms/classes/${session.class_id}` },
          { title: 'Buổi học' },
        ]}
        actions={buildActions()}
      />

      <div className="space-y-6">
        {/* Session Info */}
        <Card title="Thông tin buổi học">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Ngày học">
              {session.date.toLocaleDateString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {session.start_time} - {session.end_time}
            </Descriptions.Item>
            {role !== 'student' && (
              <Descriptions.Item label="Giảng viên">
                {session.teacher || 'N/A'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Phòng / Link">
              P301 (Online: meet.google.com/xyz)
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'red' : 'blue'}>
                {session.status === 'completed' ? 'Đã học' : session.status === 'cancelled' ? 'Đã hủy' : 'Đã lên lịch'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Chủ đề">
              IELTS Reading - Strategies & Practice
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Lesson Content - for all roles */}
        <Card title="Nội dung buổi học">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Outline:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Review từ vựng tuần trước (15 phút)</li>
                <li>Giảng chiến lược Reading - Skimming & Scanning (30 phút)</li>
                <li>Practice với bài tập mẫu (45 phút)</li>
                <li>Q&A và bài tập về nhà (15 phút)</li>
              </ul>
            </div>

            <Divider />

            <div>
              <h4 className="font-semibold mb-2">Tài liệu:</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between border rounded p-3">
                  <span>IELTS Reading Strategies.pdf</span>
                  <Button type="link" size="small">Tải xuống</Button>
                </div>
                <div className="flex items-center justify-between border rounded p-3">
                  <span>Practice Test - Reading.pdf</span>
                  <Button type="link" size="small">Tải xuống</Button>
                </div>
              </div>
            </div>

            <Divider />

            <div>
              <h4 className="font-semibold mb-2">Bài tập về nhà:</h4>
              <p className="text-gray-700">
                - Hoàn thành Practice Test 2 (Reading Section)<br />
                - Học thuộc 50 từ vựng mới từ bài đọc<br />
                - Nộp bài trước thứ 4 tuần sau
              </p>
            </div>
          </div>
        </Card>

        {/* Attendance - admin and teacher can see all, student sees own */}
        {(permissions.canTakeAttendance || role === 'student') && (
          <Card
            title="Điểm danh"
            extra={
              editMode && permissions.canTakeAttendance && (
                <Alert
                  message="Đang trong chế độ điểm danh"
                  type="info"
                  showIcon
                  closable={false}
                />
              )
            }
          >
            {role === 'sale' ? (
              <Alert
                message="Chỉ xem"
                description="Bạn chỉ có thể xem danh sách điểm danh, không thể chỉnh sửa."
                type="info"
                showIcon
                className="mb-4"
              />
            ) : null}

            {role === 'student' ? (
              <div className="p-6 bg-gray-50 rounded text-center">
                <CheckCircleOutlined className="text-4xl text-green-500 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Bạn đã tham gia buổi học này</h3>
                <p className="text-gray-600">Trạng thái: <Tag color="success">Có mặt</Tag></p>
                {session.status === 'scheduled' && (
                  <p className="text-gray-500 mt-2">Nhớ tham gia đúng giờ nhé!</p>
                )}
              </div>
            ) : (
              <Table
                dataSource={attendance}
                rowKey="id"
                columns={attendanceColumns}
                pagination={false}
                summary={() => {
                  const present = attendance.filter(a => a.status === 'present').length;
                  const absent = attendance.filter(a => a.status === 'absent').length;
                  const late = attendance.filter(a => a.status === 'late').length;

                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}>
                          <strong>Tổng kết</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <Space>
                            <Tag color="success">{present} Có mặt</Tag>
                            <Tag color="error">{absent} Vắng</Tag>
                            <Tag color="warning">{late} Muộn</Tag>
                          </Space>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          Tỉ lệ tham gia: {Math.round((present + late) / attendance.length * 100)}%
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </Card>
        )}

        {/* Teacher Notes - only for admin and teacher */}
        {(role === 'admin' || role === 'teacher') && (
          <Card title="Ghi chú buổi học">
            {session.status === 'completed' ? (
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-gray-700 mb-2">
                  <strong>Nội dung đã giảng:</strong> Hoàn thành đầy đủ theo outline. Học viên tương tác tốt.
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Đánh giá lớp:</strong> Lớp rất tích cực trong phần practice. Một số bạn còn yếu về vocabulary.
                </p>
                <p className="text-gray-700">
                  <strong>Lưu ý buổi sau:</strong> Cần dành thêm 10 phút review vocab. Bổ sung thêm bài tập khó hơn cho nhóm giỏi.
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có ghi chú cho buổi học này.</p>
            )}
          </Card>
        )}
      </div>

      {/* Notes Modal */}
      <Modal
        title="Ghi chú bài giảng"
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveNotes}>
          <Form.Item name="content" label="Nội dung đã giảng" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Mô tả những gì đã giảng trong buổi học..." />
          </Form.Item>

          <Form.Item name="classEvaluation" label="Đánh giá lớp">
            <Input.TextArea rows={3} placeholder="Đánh giá sự tham gia, tiếp thu của lớp..." />
          </Form.Item>

          <Form.Item name="nextSessionNote" label="Lưu ý buổi sau">
            <Input.TextArea rows={2} placeholder="Các điểm cần lưu ý cho buổi học tiếp theo..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lưu ghi chú
              </Button>
              <Button onClick={() => setNoteModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useNavigate } from 'react-router';
import { attendanceService } from '../../services/api/attendance.service';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';
import dayjs from 'dayjs';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  id?: number;
  student_id: number;
  studentName: string;
  email?: string;
  status: AttendanceStatus;
  notes: string;
}

interface SessionData {
  scheduleId: number;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  className: string;
  teacherName: string;
  lessonContent?: string | null;
  notes?: string | null;
  enrolledStudents: {
    id: number;
    name: string;
    email: string;
    attendance: {
      status: AttendanceStatus;
      notes: string | null;
    } | null;
  }[];
}

const statusConfig: Record<
  AttendanceStatus,
  { color: string; icon: React.ReactNode; label: string }
> = {
  present: { color: 'success', icon: <CheckCircleOutlined />, label: 'Có mặt' },
  absent: { color: 'error', icon: <CloseCircleOutlined />, label: 'Vắng' },
  late: { color: 'warning', icon: <ClockCircleOutlined />, label: 'Muộn' },
  excused: { color: 'blue', icon: <CheckCircleOutlined />, label: 'Vắng có phép' },
};

export function SessionDetailPage() {
  const { id: scheduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const permissions = usePermissions();

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [lessonContent, setLessonContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEditAttendance = permissions.canTakeAttendance && role === 'teacher';
  const canViewFullAttendance = role === 'teacher';
  const canViewAbsenceList = role === 'admin' || role === 'student';

  useEffect(() => {
    if (scheduleId) {
      fetchSessionAttendance();
    }
  }, [scheduleId]);

  const fetchSessionAttendance = async () => {
    try {
      setLoading(true);

      const res = await attendanceService.getSessionAttendance(Number(scheduleId));

      if (res.success && res.data) {
        const data: SessionData = res.data;
        setSessionData(data);

        setLessonContent(data.lessonContent || data.notes || '');

        const attendanceRecords: AttendanceRecord[] = data.enrolledStudents.map((student) => ({
          id: student.id,
          student_id: student.id,
          studentName: student.name,
          email: student.email,
          status: student.attendance?.status || 'present',
          notes: student.attendance?.notes || '',
        }));

        setAttendance(attendanceRecords);
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (value?: string | Date | null) => {
    if (!value) return 'N/A';

    const text = String(value);

    const isoMatch = text.match(/T(\d{2}:\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }

    if (/^\d{2}:\d{2}/.test(text)) {
      return text.slice(0, 5);
    }

    return text;
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);

      const attendanceData = attendance.map((rec) => ({
        student_id: rec.student_id,
        status: rec.status,
        notes: rec.notes || undefined,
      }));

      await attendanceService.markAttendance(Number(scheduleId), {
        lessonContent,
        attendances: attendanceData,
      });

      message.success('Đã lưu điểm danh thành công');
      setEditMode(false);
      await fetchSessionAttendance();
    } catch (error: any) {
      message.error(error.message || 'Lỗi lưu điểm danh');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setLessonContent(sessionData?.lessonContent || sessionData?.notes || '');

    const attendanceRecords: AttendanceRecord[] =
      sessionData?.enrolledStudents.map((student) => ({
        id: student.id,
        student_id: student.id,
        studentName: student.name,
        email: student.email,
        status: student.attendance?.status || 'present',
        notes: student.attendance?.notes || '',
      })) || [];

    setAttendance(attendanceRecords);
  };

  const handleAttendanceChange = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, status } : item))
    );
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    setAttendance((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, notes } : item))
    );
  };

  const absenceList = useMemo(
    () => attendance.filter((item) => item.status === 'absent' || item.status === 'late' || item.status === 'excused'),
    [attendance]
  );

  const summary = useMemo(() => {
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const excused = attendance.filter((a) => a.status === 'excused').length;
    const total = attendance.length;

    return {
      present,
      absent,
      late,
      excused,
      total,
      rate: total > 0 ? Math.round(((present + late + excused) / total) * 100) : 0,
    };
  }, [attendance]);

  const renderStatusTag = (status: AttendanceStatus) => {
    const config = statusConfig[status];

    return (
      <Tag icon={config.icon} color={config.color}>
        {config.label}
      </Tag>
    );
  };

  const attendanceColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Học viên',
      dataIndex: 'studentName',
      key: 'studentName',
      width: 220,
      render: (name: string, record) =>
        role !== 'student' ? (
          <Button type="link" onClick={() => navigate(`/lms/students/${record.student_id}`)}>
            {name}
          </Button>
        ) : (
          name
        ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: (email?: string) => email || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status: AttendanceStatus, record) => {
        if (canEditAttendance && editMode) {
          return (
            <Select
              value={status}
              style={{ width: '100%' }}
              onChange={(value) => handleAttendanceChange(record.student_id, value)}
              options={[
                { label: 'Có mặt', value: 'present' },
                { label: 'Vắng', value: 'absent' },
                { label: 'Muộn', value: 'late' },
                { label: 'Vắng có phép', value: 'excused' },
              ]}
            />
          );
        }

        return renderStatusTag(status);
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string, record) => {
        if (canEditAttendance && editMode) {
          return (
            <Input
              value={notes}
              placeholder="Nhập ghi chú..."
              onChange={(e) => handleNotesChange(record.student_id, e.target.value)}
            />
          );
        }

        return notes || '-';
      },
    },
  ];

  const absenceColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Học viên',
      dataIndex: 'studentName',
      key: 'studentName',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: AttendanceStatus) => renderStatusTag(status),
    },
  ];

  const buildActions = () => {
    if (!canEditAttendance) {
      return null;
    }

    if (!editMode) {
      return (
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => setEditMode(true)}
        >
          Bắt đầu điểm danh
        </Button>
      );
    }

    return (
      <Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveAttendance}
          loading={saving}
        >
          Lưu điểm danh
        </Button>
        <Button onClick={handleCancelEdit}>Hủy</Button>
      </Space>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="p-8 text-center">
        <ExclamationCircleOutlined className="text-4xl text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Buổi học không tồn tại</h2>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Buổi học - ${dayjs(sessionData.date).format('DD/MM/YYYY')}`}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lớp học', href: '/lms/classes' },
          { title: 'Chi tiết lớp' },
          { title: 'Điểm danh' },
        ]}
        actions={buildActions()}
      />

      <div className="space-y-6">
        <Card title="Thông tin buổi học">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Ngày học">
              {dayjs(sessionData.date).format('DD/MM/YYYY')}
            </Descriptions.Item>

            <Descriptions.Item label="Thời gian">
              {formatTime(sessionData.startTime)} - {formatTime(sessionData.endTime)}
            </Descriptions.Item>

            <Descriptions.Item label="Lớp học">{sessionData.className}</Descriptions.Item>

            <Descriptions.Item label="Giảng viên">{sessionData.teacherName}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Nội dung buổi học">
          {canEditAttendance && editMode ? (
            <Input.TextArea
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="Nhập nội dung buổi học..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              maxLength={2000}
              showCount
            />
          ) : (
            <div className="whitespace-pre-line min-h-[80px] text-gray-700">
              {lessonContent || 'Chưa có nội dung buổi học'}
            </div>
          )}
        </Card>

        {canEditAttendance && editMode && (
          <Alert
            message="Đang trong chế độ điểm danh"
            description="Bạn có thể nhập nội dung buổi học, chỉnh trạng thái và ghi chú cho từng học viên. Nhấn Lưu điểm danh để cập nhật dữ liệu."
            type="info"
            showIcon
          />
        )}

        {canViewFullAttendance && (
          <Card title="Bảng điểm danh">
            <Table
              dataSource={attendance}
              rowKey="student_id"
              columns={attendanceColumns}
              pagination={false}
              scroll={{ x: 800 }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <strong>Tổng kết</strong>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={1}>
                      Tổng: {summary.total}
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={2}>
                      <Space wrap>
                        <Tag color="success">{summary.present} Có mặt</Tag>
                        <Tag color="error">{summary.absent} Vắng</Tag>
                        <Tag color="warning">{summary.late} Muộn</Tag>
                        <Tag color="blue">{summary.excused} Vắng có phép</Tag>
                      </Space>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={3}>
                      Tỉ lệ tham gia: {summary.rate}%
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        )}

        {canViewAbsenceList && (
          <Card title="Danh sách vắng / muộn">
            <Table
              dataSource={absenceList}
              rowKey="student_id"
              columns={absenceColumns}
              pagination={false}
              locale={{ emptyText: 'Không có học viên vắng hoặc muộn' }}
            />
          </Card>
        )}

        {role === 'student' && (
          <Card title="Trạng thái của bạn">
            {attendance[0] ? (
              <Space direction="vertical">
                <div>{renderStatusTag(attendance[0].status)}</div>
                <div className="text-gray-600">
                  Ghi chú: {attendance[0].notes || 'Không có ghi chú'}
                </div>
              </Space>
            ) : (
              <Alert message="Chưa có dữ liệu điểm danh cho bạn" type="info" showIcon />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
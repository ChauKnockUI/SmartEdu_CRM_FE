import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
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
  ReloadOutlined,
  SaveOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams } from 'react-router';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { attendanceService } from '../../services/api/attendance.service';
import { scheduleService, type ScheduleChange } from '../../services/api/schedule.service';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';
import dayjs from 'dayjs';
import { SessionStatusTag } from './sessionStatus';
import { SessionScheduleActions } from './SessionScheduleActions';
import { summarizeAttendance, isAttendanceAttention } from '../../shared/utils/attendance';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  id?: number;
  student_id: number;
  studentName: string;
  email?: string;
  status: AttendanceStatus | null;
  notes: string;
  is_attendance_unlocked?: boolean;
}

interface SessionData {
  scheduleId: number;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  className: string;
  teacherName: string;
  roomName?: string;
  status: string;
  scheduleChange?: ScheduleChange;
  attendanceAccess: { canMark: boolean; blockReason: string; canRequestUnlock: boolean;
    timeLocked: boolean; cancelled: boolean; notStarted: boolean };
  lessonContent?: string | null;
  notes?: string | null;
  is_attendance_unlocked?: boolean;
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
  const { openDetail } = useDetailNavigation();
  const { user } = useAuth();
  const role = user?.role;
  const permissions = usePermissions();

  const [loading, setLoading] = useState(true);
  const scope = `${user?.id}:${role}:${scheduleId}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const requestId = useRef(0);
  const fetchAbort = useRef<AbortController | null>(null);
  const [loadedScope, setLoadedScope] = useState('');
  const [loadedSession, setSessionData] = useState<SessionData | null>(null);
  const sessionData = loadedScope === scope ? loadedSession : null;
  const [loadError, setLoadError] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [lessonContent, setLessonContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [togglingUnlock, setTogglingUnlock] = useState(false);
  const [requestingUnlock, setRequestingUnlock] = useState(false);
  const [unlockRequested, setUnlockRequested] = useState(false);
  const [scheduleActionActive, setScheduleActionActive] = useState(false);
  const savingRef = useRef(false);


  const access = sessionData?.attendanceAccess;
  const canEditAttendance = permissions.canTakeAttendance && role === 'teacher' && !!access?.canMark;
  const canViewFullAttendance = role === 'teacher' || role === 'admin' || role === 'sale';
  const canViewAbsenceList = role === 'admin';

  const handleRemindTeacher = async () => {
    try {
      setReminding(true);
      const res = await scheduleService.remindAttendance(Number(scheduleId));
      if (scope !== currentScope.current) return;
      if (res.data?.sent === false) message.info(res.message);
      else message.success(res.message || 'Đã gửi thông báo nhắc giảng viên điểm danh thành công!');
    } catch (err: any) {
      if (scope === currentScope.current) message.error(err.message || 'Lỗi gửi nhắc điểm danh');
    } finally {
      if (scope === currentScope.current) setReminding(false);
    }
  };

  const isLockedByTime = !!access?.timeLocked;

  const handleToggleUnlock = async (unlock: boolean) => {
    try {
      setTogglingUnlock(true);
      const res = await attendanceService.toggleUnlock(Number(scheduleId), unlock);
      if (scope !== currentScope.current) return;
      window.dispatchEvent(new Event('crm:notifications-changed'));
      message.success(res.message);
      await fetchSessionAttendance();
    } catch (err: any) {
      if (scope === currentScope.current) message.error(err.message || 'Thao tác thất bại');
    } finally {
      if (scope === currentScope.current) setTogglingUnlock(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!access?.canRequestUnlock || requestingUnlock || unlockRequested) return;
    try {
      setRequestingUnlock(true);
      const res = await attendanceService.requestUnlock(Number(scheduleId));
      if (scope !== currentScope.current) return;
      setUnlockRequested(true);
      message.success(res.message);
    } catch (err: any) {
      if (scope === currentScope.current) message.error(err.message || 'Lỗi gửi yêu cầu');
    } finally {
      if (scope === currentScope.current) setRequestingUnlock(false);
    }
  };

  useEffect(() => {
    currentScope.current = scope;
    setSessionData(null); setLoadedScope(''); setAttendance([]); setLessonContent(''); setLoadError('');
    setEditMode(false); setSaving(false); setReminding(false); setTogglingUnlock(false); setRequestingUnlock(false); setUnlockRequested(false);
    setScheduleActionActive(false);
    fetchSessionAttendance();
    return () => { requestId.current++; fetchAbort.current?.abort(); if (currentScope.current === scope) currentScope.current = ''; };
  }, [scope]);

  const fetchSessionAttendance = async () => {
    const request = ++requestId.current;
    fetchAbort.current?.abort();
    const controller = new AbortController(); fetchAbort.current = controller;
    try {
      setLoading(true);
      setLoadError('');

      const res = await attendanceService.getSessionAttendance(Number(scheduleId), controller.signal);
      if (scope !== currentScope.current || request !== requestId.current || controller.signal.aborted) return;
      if (!res.success || !res.data) throw new Error('Không tìm thấy buổi học trong phạm vi được xem.');

      if (res.success && res.data) {
        const data: SessionData = res.data;
        setSessionData(data);
        setLoadedScope(scope);

        setLessonContent(data.lessonContent || data.notes || '');

        const attendanceRecords: AttendanceRecord[] = data.enrolledStudents.map((student) => ({
          id: student.id,
          student_id: student.id,
          studentName: student.name,
          email: student.email,
          status: student.attendance?.status || null,
          notes: student.attendance?.notes || '',
        }));

        setAttendance(attendanceRecords);
      }
    } catch (error: any) {
      if (scope === currentScope.current && request === requestId.current && !controller.signal.aborted) {
        setLoadError(error.message || 'Không tải được dữ liệu điểm danh.'); setSessionData(null); setAttendance([]);
      }
    } finally {
      if (scope === currentScope.current && request === requestId.current) setLoading(false);
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
    if (!canEditAttendance || savingRef.current) return;
    const unmarked = attendance.filter(item => !item.status).length;
    if (!attendance.length || unmarked) {
      message.warning(unmarked ? `Còn ${unmarked} học viên chưa được chọn trạng thái.` : 'Chưa có học viên để điểm danh.'); return;
    }
    savingRef.current = true;
    try {
      setSaving(true);

      const attendanceData = attendance.map((rec) => ({
        student_id: rec.student_id,
        status: rec.status!,
        notes: rec.notes || undefined,
      }));

      const result = await attendanceService.markAttendance(Number(scheduleId), {
        lessonContent,
        attendances: attendanceData,
      });
      if (scope !== currentScope.current) return;
      if (result.success) window.dispatchEvent(new Event('crm:notifications-changed'));

      message.success('Đã lưu điểm danh thành công');
      setEditMode(false);
      await fetchSessionAttendance();
    } catch (error: any) {
      if (scope === currentScope.current) message.error(error.message || 'Lỗi lưu điểm danh');
    } finally {
      savingRef.current = false;
      if (scope === currentScope.current) setSaving(false);
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
        status: student.attendance?.status || null,
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
    () => access?.cancelled ? [] : attendance.filter(item => isAttendanceAttention(item.status)),
    [attendance, access?.cancelled]
  );

  const summary = useMemo(() => summarizeAttendance(attendance), [attendance]);

  const renderStatusTag = (status: AttendanceStatus | null) => {
    if (access?.cancelled) return <Tag>Không áp dụng điểm danh</Tag>;
    if (!status) return <Tag>Chưa điểm danh</Tag>;
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
          <Button type="link" onClick={() => openDetail(`/lms/students/${record.student_id}`)}>
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
      render: (status: AttendanceStatus | null, record) => {
        if (canEditAttendance && editMode) {
          return (
            <Select
              value={status || undefined}
              placeholder="Chưa điểm danh"
              disabled={saving}
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
              disabled={saving}
              maxLength={1000}
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
    if (!sessionData || access?.cancelled || access?.notStarted) return null;
    // Dành cho Admin
    if (role === 'admin') {
      const isAttended = sessionData.enrolledStudents.some(s => !!s.attendance);
      return (
        <Space>
          {/* Nút Mở / Khóa quyền điểm danh */}
          {sessionData?.is_attendance_unlocked ? (
            <Button
              danger
              loading={togglingUnlock}
              disabled={scheduleActionActive}
              onClick={() => handleToggleUnlock(false)}
            >
              Khóa lại điểm danh
            </Button>
          ) : isLockedByTime ? (
            <Button
              type="primary"
              style={{ backgroundColor: '#52c41a' }}
              loading={togglingUnlock}
              disabled={scheduleActionActive}
              onClick={() => handleToggleUnlock(true)}
            >
              Mở quyền điểm danh cho GV
            </Button>
          ) : null}

          {!isAttended && sessionData.enrolledStudents.length > 0 && (
            <Button
              danger
              icon={<BellOutlined />}
              loading={reminding}
              disabled={scheduleActionActive}
              onClick={handleRemindTeacher}
            >
              Nhắc GV điểm danh
            </Button>
          )}
        </Space>
      );
    }

    // Dành cho Giáo viên
    if (role === 'teacher' && access?.canRequestUnlock) {
      return (
        <Button
          type="primary"
          danger
          icon={<BellOutlined />}
          loading={requestingUnlock}
          disabled={unlockRequested || scheduleActionActive}
          onClick={handleRequestUnlock}
        >
          {unlockRequested ? 'Đã gửi yêu cầu mở khóa' : 'Yêu cầu Admin mở khóa'}
        </Button>
      );
    }
    if (!canEditAttendance) return null;

    if (!editMode) {
      return (
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={!attendance.length || scheduleActionActive}
          onClick={() => setEditMode(true)}
        >
          {sessionData.enrolledStudents.some(s => !!s.attendance) ? 'Chỉnh sửa điểm danh' : 'Bắt đầu điểm danh'}
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
        <Button disabled={saving} onClick={handleCancelEdit}>Hủy</Button>
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
    return <Alert type="error" showIcon message="Không tải được buổi học" description={loadError || 'Vui lòng thử tải lại.'}
      action={<Button onClick={fetchSessionAttendance}>Thử lại</Button>} />;
  }

  return (
    <div className="crm-page">
      <PageHeader
        title={`Buổi học - ${dayjs(sessionData.date).format('DD/MM/YYYY')}`}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lớp học', href: '/lms/classes' },
          { title: 'Chi tiết lớp' },
          { title: 'Điểm danh' },
        ]}
        actions={<Space wrap><Button icon={<ReloadOutlined />} disabled={editMode || saving || scheduleActionActive} onClick={fetchSessionAttendance}>Tải lại</Button>{buildActions()}</Space>}
      />

      {access?.cancelled && <Alert className="mb-4" showIcon type="warning" message={sessionData.scheduleChange?.pendingMakeup ? 'Buổi học đã nghỉ, đang chờ xếp học bù' : 'Buổi học hoặc lớp học đã hủy'}
        description="Không thể điểm danh hoặc yêu cầu mở khóa. Kết quả cũ (nếu có) chỉ dùng để tra cứu." />}
      {access?.notStarted && !access.cancelled && <Alert className="mb-4" showIcon type="info" message="Chưa đến giờ bắt đầu buổi học"
        description="Bạn có thể xem thông tin. Khi đến giờ học, bấm Tải lại để bắt đầu điểm danh." />}
      {role === 'teacher' && !access?.canMark && !access?.canRequestUnlock && !access?.cancelled && !access?.notStarted
        && <Alert className="mb-4" showIcon type="info" message={access?.blockReason || 'Bạn không phụ trách điểm danh buổi học này.'} />}

      {/* Cảnh báo dành riêng cho Giáo viên khi bị khóa */}
      {role === 'teacher' && access?.canRequestUnlock && (
        <Alert
          message="Buổi học đã bị khóa điểm danh"
          description={unlockRequested ? 'Đã gửi yêu cầu tới Admin. Sau khi được mở khóa, bấm Tải lại để cập nhật.' : 'Đã quá 48 giờ từ lúc bắt đầu buổi học. Bạn có thể bấm Yêu cầu Admin mở khóa ở góc trên.'}
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {/* Thông báo cho Admin biết ca này đang khóa và GV không thể điểm danh nếu Admin chưa bấm mở */}
      {role === 'admin' && isLockedByTime && !access?.cancelled && !sessionData?.is_attendance_unlocked && (
        <Alert
          message="Ca học đang khóa quyền điểm danh của Giáo viên (quá 48h)"
          description="Giáo viên hiện không thể điểm danh ca này. Bạn có thể bấm nút 'Mở quyền điểm danh cho GV' ở góc trên nếu cần cho phép giáo viên cập nhật."
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      {/* Thông báo khi đã được mở khóa */}
      {sessionData?.is_attendance_unlocked && !access?.cancelled && !access?.notStarted && (
        <Alert
          message="Quyền điểm danh đang được mở bởi Admin"
          description="Buổi học đã được Quản trị viên mở khóa. Giáo viên có thể tiến hành điểm danh và lưu dữ liệu bình thường."
          type="success"
          showIcon
          className="mb-4"
        />
      )}

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
            <Descriptions.Item label="Phòng học">{sessionData.roomName || 'Chưa phân công'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái buổi học"><SessionStatusTag status={access?.cancelled ? 'cancelled' : sessionData.status} scheduleChange={sessionData.scheduleChange} /></Descriptions.Item>
          </Descriptions>
        </Card>

        <SessionScheduleActions key={scope} scheduleId={sessionData.scheduleId} role={role}
          scheduleChange={sessionData.scheduleChange} startTime={sessionData.startTime} endTime={sessionData.endTime}
          disabled={editMode || saving || togglingUnlock || requestingUnlock || reminding}
          onActiveChange={active => { if (scope === currentScope.current) setScheduleActionActive(active); }}
          onChanged={async () => { if (scope === currentScope.current) await fetchSessionAttendance(); }} />

        <Card title="Nội dung buổi học">
          {canEditAttendance && editMode ? (
            <Input.TextArea
              disabled={saving}
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
            description="Các lựa chọn đang là bản nháp. Chọn trạng thái từng học viên hoặc dùng nút Có mặt cho học viên chưa chọn, rồi bấm Lưu điểm danh."
            type="info"
            showIcon
          />
        )}

        {canViewFullAttendance && (
          <Card title={editMode ? 'Bảng điểm danh — Bản nháp chưa lưu' : 'Bảng điểm danh'}
            extra={canEditAttendance && editMode && summary.unmarked > 0
              ? <Button disabled={saving} onClick={() => setAttendance(previous => previous.map(item => item.status ? item : { ...item, status: 'present' }))}>Có mặt cho học viên chưa chọn</Button> : undefined}>
            <Table
              dataSource={attendance}
              rowKey="student_id"
              columns={attendanceColumns}
              pagination={false}
              scroll={{ x: 800 }}
              summary={() => access?.cancelled ? (
                <Table.Summary><Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>Buổi nghỉ/hủy: không áp dụng thống kê điểm danh.</Table.Summary.Cell>
                </Table.Summary.Row></Table.Summary>
              ) : (
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
                        <Tag>{summary.unmarked} Chưa điểm danh</Tag>
                      </Space>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={3}>
                      Tỷ lệ tham gia: {summary.rate === null ? 'Chưa có dữ liệu' : `${summary.rate}%`}
                      <div className="text-xs text-gray-500">Riêng buổi này · (Có mặt + Muộn) / số đã điểm danh, gồm vắng có phép.</div>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        )}

        {canViewAbsenceList && !access?.cancelled && (
          <Card title="Danh sách vắng / muộn (gồm vắng có phép)">
            <Table
              dataSource={absenceList}
              rowKey="student_id"
              columns={absenceColumns}
              pagination={false}
              locale={{ emptyText: summary.unmarked > 0 ? `Còn ${summary.unmarked} học viên chưa điểm danh` : 'Không có học viên vắng, muộn hoặc vắng có phép' }}
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

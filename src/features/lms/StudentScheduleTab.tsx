import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { studentService, type StudentSchedule } from '../../services/api/student.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { SessionAttendanceTag, SessionStatusTag } from './sessionStatus';

const currentMonth = (): [Dayjs, Dayjs] => {
  const today = dayjs(new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10));
  return [today.startOf('month'), today.endOf('month')];
};
const time = (value: string | null) => value?.match(/(?:^|T)(\d{2}:\d{2})/)?.[1] || '--:--';

export function StudentScheduleTable({ rows, loading, total, page, onPage, onOpen }: {
  rows: StudentSchedule[]; loading: boolean; total: number; page: number;
  onPage: (page: number) => void; onOpen: (id: number) => void;
}) {
  const columns: ColumnsType<StudentSchedule> = [
    { title: 'Ngày / Giờ', width: 190, render: (_, row) => <>
      <div>{dayjs(row.date.slice(0, 10)).locale('vi').format('ddd, DD/MM/YYYY')}</div>
      <Typography.Text type="secondary">{time(row.start_time)} – {time(row.end_time)}</Typography.Text>
    </> },
    { title: 'Lớp học', render: (_, row) => row.class?.name || 'Chưa có lớp' },
    { title: 'Giáo viên', render: (_, row) => row.teacher?.full_name || 'Chưa phân công' },
    { title: 'Phòng', render: (_, row) => row.room?.name || 'Chưa phân công' },
    { title: 'Trạng thái', width: 210, render: (_, row) => <Space direction="vertical" size={2}>
      <SessionStatusTag status={row.class?.status === 'cancelled' ? 'cancelled' : row.status} scheduleChange={row.scheduleChange} />
      {row.scheduleChange.pendingMakeup && <Typography.Text type="secondary">{row.scheduleChange.history[row.scheduleChange.history.length - 1]?.reason}</Typography.Text>}
    </Space> },
    { title: 'Điểm danh học viên', width: 170, render: (_, row) => <SessionAttendanceTag
      status={row.class?.status === 'cancelled' ? 'cancelled' : row.status} attendances={row.attendances} personal /> },
    { title: 'Thao tác', width: 125, render: (_, row) => <Button type="link" size="small" onClick={() => onOpen(row.id)}>Xem buổi học</Button> },
  ];
  return <Table<StudentSchedule> rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 1050 }}
    locale={{ emptyText: loading ? 'Đang tải lịch học…' : 'Không có buổi học trong khoảng ngày và lớp đã chọn' }}
    pagination={paginationProps('buổi học', { current: page, pageSize: 10, total, showSizeChanger: false,
      onChange: onPage, hideOnSinglePage: true })} />;
}

export function StudentScheduleTab({ studentId, enrollments, enabled, revision }: {
  studentId: number; enrollments: { class_id: number; status: string; class?: { name: string } }[];
  enabled: boolean; revision: number;
}) {
  const { user, token } = useAuth();
  const { openDetail } = useDetailNavigation();
  const [range, setRange] = useState<[Dayjs, Dayjs]>(currentMonth);
  const [classId, setClassId] = useState<number>();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof studentService.getSchedules>> | null>(null);
  const start = range[0].format('YYYY-MM-DD'), end = range[1].format('YYYY-MM-DD');
  const key = JSON.stringify([user?.id, user?.role, token, studentId, start, end, classId, page, revision, reload]);
  useEffect(() => {
    if (!enabled || !token) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(null); setOwner(key);
    studentService.getSchedules(studentId, { start_date: start, end_date: end, class_id: classId, page, limit: 10 }, controller.signal, token)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Không tải được lịch học.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [key, enabled]);
  const visible = owner === key ? result : null;
  const busy = loading || owner !== key;
  return <Card title="Lịch học theo từng buổi" extra={<Button loading={busy} onClick={() => setReload(value => value + 1)}>Tải lại lịch</Button>}>
    <Space wrap className="mb-3">
      <Select aria-label="Lọc lịch theo lớp" placeholder="Tất cả lớp đang ghi danh" allowClear showSearch optionFilterProp="label"
        style={{ width: 250 }} value={classId} options={enrollments.filter(item => item.status === 'active')
          .map(item => ({ value: item.class_id, label: item.class?.name || `Lớp ${item.class_id}` }))}
        onChange={value => { setClassId(value); setPage(1); }} />
      <DatePicker.RangePicker aria-label="Khoảng ngày học" value={range} format="DD/MM/YYYY" allowClear={false}
        onChange={value => { if (value?.[0] && value[1]) { setRange([value[0], value[1]]); setPage(1); } }} />
      <Button onClick={() => { setRange(currentMonth()); setClassId(undefined); setPage(1); }}>Đặt lại</Button>
    </Space>
    <p className="mb-3 text-xs text-gray-500">Lịch thực tế theo các lớp đang ghi danh, gồm cả buổi nghỉ và học bù; không gồm lớp đã nghỉ.
      Mặc định xem tháng hiện tại, mỗi lần lọc tối đa 1 năm.</p>
    {error && owner === key ? <Alert type="error" showIcon message="Không tải được lịch học" description={error}
      action={<Button onClick={() => setReload(value => value + 1)}>Thử lại</Button>} />
      : <StudentScheduleTable rows={visible?.data || []} loading={busy} total={visible?.pagination.total || 0}
        page={visible?.pagination.page || page} onPage={setPage} onOpen={id => openDetail(`/lms/sessions/${id}`)} />}
  </Card>;
}

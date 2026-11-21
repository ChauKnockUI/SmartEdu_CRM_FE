import { Tag } from 'antd';

export type SessionChangeState = { pendingMakeup?: boolean; isMakeup?: boolean };
export function SessionStatusTag({ status, scheduleChange }: { status?: string; scheduleChange?: SessionChangeState }) {
  const meta = scheduleChange?.pendingMakeup ? { color: 'orange', label: 'Nghỉ · Chờ học bù' }
    : scheduleChange?.isMakeup && status === 'scheduled' ? { color: 'cyan', label: 'Lịch học bù' }
    : status === 'cancelled' ? { color: 'red', label: 'Đã hủy' }
    : status === 'completed' ? { color: 'blue', label: 'Đã kết thúc' }
    : status === 'scheduled' ? { color: 'default', label: 'Đã lên lịch' }
    : { color: 'default', label: 'Chưa xác định' };
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

export function SessionAttendanceTag({ status, attendances = [], personal = false }: {
  status?: string; attendances?: { status: string }[]; personal?: boolean;
}) {
  if (status === 'cancelled') return <Tag>Không áp dụng điểm danh</Tag>;
  if (!attendances.length) return <Tag>Chưa điểm danh</Tag>;
  if (!personal) return <Tag color="green">Đã ghi nhận điểm danh</Tag>;
  const meta = ({ present: ['green', 'Có mặt'], absent: ['red', 'Vắng'], late: ['orange', 'Muộn'],
    excused: ['blue', 'Vắng có phép'] } as Record<string, string[]>)[attendances[0].status];
  return <Tag color={meta?.[0]}>{meta?.[1] || 'Chưa xác định'}</Tag>;
}

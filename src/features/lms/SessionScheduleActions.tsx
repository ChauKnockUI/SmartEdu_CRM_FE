import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, Modal, Space, TimePicker, Timeline, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { scheduleService, type ScheduleChange } from '../../services/api/schedule.service';
import type { UserRole } from '../../shared/contexts/AuthContext';

interface Props {
  scheduleId: number;
  role?: UserRole;
  scheduleChange?: ScheduleChange;
  startTime: string | Date | null;
  endTime: string | Date | null;
  disabled: boolean;
  onActiveChange: (active: boolean) => void;
  onChanged: () => Promise<void>;
}

interface ActionValues {
  date?: Dayjs;
  time?: [Dayjs, Dayjs];
  reason: string;
}

// Preserve the stored clock time; schedule time values may also be ISO strings.
const clockTime = (value: string | Date | null) => {
  if (!value) return null;
  const clock = (value instanceof Date ? value.toISOString() : value).match(/(?:T|^)(\d{2}:\d{2})/)?.[1];
  return clock ? dayjs(`2000-01-01T${clock}:00`) : null;
};

export function SessionScheduleActions({ scheduleId, role, scheduleChange, startTime, endTime,
  disabled, onActiveChange, onChanged }: Props) {
  const [action, setAction] = useState<'cancel' | 'makeup' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm<ActionValues>();
  const mounted = useRef(false);
  const busy = useRef(false);
  const request = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const canManage = role === 'admin' || role === 'teacher';
  // The backend scopes these capabilities to the admin or actual session teacher.
  const canCancel = canManage && !!scheduleChange?.canCancel;
  const canMakeup = canManage && !!scheduleChange?.canMakeup;
  const latest = useRef({ disabled, canCancel, canMakeup, action });
  latest.current = { disabled, canCancel, canMakeup, action };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      abort.current?.abort();
    };
  }, []);

  const openAction = (next: 'cancel' | 'makeup') => {
    if (busy.current || disabled || (next === 'cancel' ? !canCancel : !canMakeup)) return;
    form.resetFields();
    if (next === 'makeup') {
      const start = clockTime(startTime), end = clockTime(endTime);
      if (start && end) form.setFieldsValue({ time: [start, end] });
    }
    setError('');
    setAction(next);
    onActiveChange(true);
  };

  const close = () => {
    if (busy.current) return;
    setAction(null);
    setError('');
    onActiveChange(false);
  };

  const submit = async () => {
    if (!action || busy.current || disabled || (action === 'cancel' ? !canCancel : !canMakeup)) return;
    busy.current = true;
    setSaving(true);
    setError('');
    const operation = ++request.current;
    const isCurrent = () => mounted.current && request.current === operation;
    try {
      const values = await form.validateFields();
      if (!isCurrent()) return;
      const current = latest.current;
      if (current.disabled || current.action !== action || (action === 'cancel' ? !current.canCancel : !current.canMakeup)) {
        setError('Quyền thao tác đã thay đổi. Vui lòng đóng hộp thoại và tải lại buổi học.');
        return;
      }
      const controller = new AbortController();
      abort.current = controller;
      if (action === 'cancel') {
        await scheduleService.cancel(scheduleId, { reason: values.reason.trim() }, controller.signal);
      } else {
        await scheduleService.makeup(scheduleId, {
          date: values.date!.format('YYYY-MM-DD'),
          start_time: values.time![0].format('HH:mm'),
          end_time: values.time![1].format('HH:mm'),
          reason: values.reason.trim(),
        }, controller.signal);
      }
      if (!isCurrent()) return;
      window.dispatchEvent(new Event('crm:notifications-changed'));
      setAction(null);
      onActiveChange(false);
      await onChanged();
    } catch (err: unknown) {
      if (isCurrent() && !(err && typeof err === 'object' && 'errorFields' in err)) {
        setError(err instanceof Error ? err.message : 'Thao tác thất bại. Vui lòng thử lại.');
      }
    } finally {
      if (isCurrent()) {
        busy.current = false;
        setSaving(false);
      }
    }
  };

  const actionAllowed = action === 'cancel' ? canCancel : canMakeup;
  if (!canCancel && !canMakeup && !scheduleChange?.pendingMakeup && !scheduleChange?.history?.length) return null;

  return (
    <Card title="Thay đổi lịch học" extra={canManage && <Space wrap>
      {canCancel && <Button danger disabled={disabled || saving || !!action} onClick={() => openAction('cancel')}>Báo nghỉ buổi học</Button>}
      {canMakeup && <Button type="primary" disabled={disabled || saving || !!action} onClick={() => openAction('makeup')}>Xếp lịch học bù</Button>}
    </Space>}>
      {scheduleChange?.pendingMakeup && <Alert className="mb-4" type="warning" showIcon
        message="Buổi học đang chờ xếp lịch học bù"
        description="Lịch học bù chưa được xác nhận. Vui lòng theo dõi cập nhật lịch học." />}
      {disabled && (canCancel || canMakeup) && <Typography.Paragraph type="secondary">
        Hoàn tất thao tác điểm danh trước khi thay đổi lịch học.
      </Typography.Paragraph>}
      {scheduleChange?.history?.length ? <Timeline items={scheduleChange.history.map(item => ({
        color: item.action === 'cancel' ? 'red' : 'blue',
        children: <div>
          <div><strong>{item.action === 'cancel' ? 'Báo nghỉ buổi học' : 'Xếp lịch học bù'}</strong>
            {' · '}{dayjs(item.date).format('DD/MM/YYYY')}
            {item.start_time && item.end_time && ` · ${clockTime(item.start_time)?.format('HH:mm') || '—'} – ${clockTime(item.end_time)?.format('HH:mm') || '—'}`}
          </div>
          <div className="whitespace-pre-wrap break-words">Lý do: {item.reason}</div>
          <Typography.Text type="secondary">Ghi nhận lúc {dayjs(item.at).format('HH:mm DD/MM/YYYY')}</Typography.Text>
        </div>,
      }))} /> : <Typography.Text type="secondary">Chưa có lịch sử thay đổi lịch học.</Typography.Text>}

      <Modal title={action === 'cancel' ? 'Xác nhận nghỉ buổi học' : 'Xếp lịch học bù'} open={!!action}
        okText={action === 'cancel' ? 'Xác nhận nghỉ' : 'Lưu lịch học bù'} cancelText="Đóng"
        onOk={submit} onCancel={close} confirmLoading={saving}
        okButtonProps={{ danger: action === 'cancel', disabled: disabled || !actionAllowed }}
        cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving}>
        {error && <Alert className="mb-4" type="error" showIcon message={error} />}
        {action === 'cancel' && <Typography.Paragraph>
          Buổi học này sẽ chuyển sang chờ xếp học bù. Vui lòng nhập lý do nghỉ để lưu vào lịch sử.
        </Typography.Paragraph>}
        <Form form={form} layout="vertical" disabled={saving || disabled || !actionAllowed}>
          {action === 'makeup' && <>
            <Form.Item name="date" label="Ngày học bù" rules={[{ required: true, message: 'Chọn ngày học bù.' }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="time" label="Giờ học bù" rules={[{ required: true, type: 'array', len: 2, message: 'Chọn giờ bắt đầu và kết thúc.' }]}>
              <TimePicker.RangePicker className="w-full" format="HH:mm" />
            </Form.Item>
          </>}
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do.' }]}>
            <Input.TextArea rows={3} maxLength={1000} showCount placeholder={action === 'cancel' ? 'Lý do nghỉ buổi học' : 'Lý do học bù'} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

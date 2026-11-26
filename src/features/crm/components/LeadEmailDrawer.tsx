import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Space, Typography, message } from 'antd';
import { leadService } from '@/services/api/lead.service';
import { leadContactBlockReason } from '../leadAssignment';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Link } from 'react-router';

export function LeadEmailNotice({ available }: { available: boolean }) {
  const { user } = useAuth();
  return <Alert showIcon type={available ? 'info' : 'warning'}
    message={available ? 'Gửi email từ CRM' : 'Chưa cấu hình dịch vụ gửi email'}
    description={available
      ? 'Email được gửi đến địa chỉ đang lưu trên Lead. Dịch vụ tiếp nhận email chưa có nghĩa là khách đã nhận hoặc đọc.'
      : user?.role === 'admin' ? <Link to="/settings/email">Cấu hình email chăm sóc của trung tâm</Link>
        : 'Vui lòng liên hệ Admin trung tâm để cấu hình email chăm sóc.'} />;
}

function requestId() {
  // getRandomValues also works when a local development host is opened over HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function LeadEmailDrawer({ open, lead, onClose, onSent }: { open: boolean; lead: any; onClose: () => void; onSent: () => void }) {
  const [form] = Form.useForm();
  const [config, setConfig] = useState<{ available: boolean; from?: string } | null>(null);
  const [configError, setConfigError] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [deliveryUnknown, setDeliveryUnknown] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  const draft = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const blocked = leadContactBlockReason(lead);

  const loadConfig = async () => {
    setConfigError(''); setConfig(null);
    try {
      const response = await leadService.getEmailConfiguration();
      if (active.current) setConfig(response.data);
    } catch (err: any) {
      if (active.current) setConfigError(err.message || 'Không kiểm tra được dịch vụ email.');
    }
  };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => { if (open) loadConfig(); }, [open]);

  const send = async (values: { subject: string; text: string }) => {
    if (busy.current || deliveryUnknown || !config?.available || blocked) return;
    const payload = { to: lead.email.trim(), subject: values.subject.trim(), text: values.text.trim() };
    const fingerprint = JSON.stringify(payload);
    busy.current = true; setSending(true); setError('');
    try {
      if (draft.current?.fingerprint !== fingerprint) draft.current = { fingerprint, requestId: requestId() };
      const response = await leadService.sendEmail(lead.id, { ...payload, request_id: draft.current.requestId });
      if (!response.data?.history_saved) message.warning(response.message, 10);
      else if (response.data.lead_updated === false) message.warning('Dịch vụ đã tiếp nhận email và lưu lịch sử. Lead vừa thay đổi ở nơi khác; vui lòng kiểm tra lại.');
      else message.success(response.message);
      if (active.current) { form.resetFields(); draft.current = null; onSent(); onClose(); }
    } catch (err: any) {
      if (active.current) {
        setDeliveryUnknown(err.deliveryUnknown === true || !err.status);
        setError(!err.status ? 'Mất kết nối khi gửi. Hãy kiểm tra mục Đã gửi trong Gmail của trung tâm trước khi gửi lại.'
          : err.message || 'Chưa xác nhận được kết quả gửi. Vui lòng kiểm tra Gmail trước khi thử lại.');
      }
    } finally {
      busy.current = false;
      if (active.current) setSending(false);
    }
  };

  return <Drawer title="Soạn và gửi email" open={open} width={520} styles={{ wrapper: { maxWidth: '100vw' } }}
    onClose={() => { if (!busy.current) onClose(); }} maskClosable={!sending} closable={!sending} keyboard={!sending}>
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {configError ? <Alert type="error" showIcon message={configError} action={<Button onClick={loadConfig}>Thử lại</Button>} />
        : config ? <LeadEmailNotice available={config.available} /> : <Typography.Text>Đang kiểm tra dịch vụ email...</Typography.Text>}
      {blocked && <Alert type="warning" showIcon message={blocked} />}
      {error && <Alert type={deliveryUnknown ? 'warning' : 'error'} showIcon message={error}
        description={deliveryUnknown ? 'Chỉ gửi lại nếu thư chưa có trong mục Đã gửi của Gmail trung tâm.' : undefined} />}
      {deliveryUnknown && <Button onClick={() => { setDeliveryUnknown(false); setError(''); draft.current = null; }}>Tôi đã kiểm tra Gmail</Button>}
      <Form form={form} layout="vertical" onFinish={send} disabled={sending}>
        {config?.from && <Typography.Paragraph type="secondary">Người gửi: {config.from}</Typography.Paragraph>}
        <Form.Item label="Người nhận"><Input value={lead.email} readOnly /></Form.Item>
        <Form.Item name="subject" label="Tiêu đề" rules={[{ required: true, whitespace: true, message: 'Nhập tiêu đề email' },
          { max: 200, message: 'Tiêu đề tối đa 200 ký tự' }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="text" label="Nội dung" rules={[{ required: true, whitespace: true, message: 'Nhập nội dung email' },
          { max: 10000, message: 'Nội dung tối đa 10.000 ký tự' }]}><Input.TextArea rows={8} maxLength={10000} showCount /></Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={sending} disabled={deliveryUnknown || !config?.available || !!blocked}>Gửi email</Button>
          <Button onClick={onClose} disabled={sending}>Hủy</Button>
        </Space>
      </Form>
    </Space>
  </Drawer>;
}

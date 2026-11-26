import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Space, Spin, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { leadService } from '@/services/api/lead.service';
import { leadContactBlockReason } from '../leadAssignment';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Link } from 'react-router';

export function LeadEmailNotice({ available }: { available: boolean }) {
  const { user } = useAuth();
  if (available) return null;
  return <Alert showIcon type="warning" message="Chưa kết nối email trung tâm"
    description={user?.role === 'admin' ? <Link to="/settings/email">Mở cài đặt email</Link>
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

  return <Drawer title="Soạn email" open={open} width={600} rootClassName="crm-email-drawer"
    styles={{ wrapper: { maxWidth: '100vw' }, body: { padding: 0 } }}
    onClose={() => { if (!busy.current) onClose(); }} maskClosable={!sending} closable={!sending} keyboard={!sending}
    footer={<div className="crm-email-actions">
      <span className="crm-email-caption">Ghi lại trong lịch sử chăm sóc</span>
      <Space>
        <Button onClick={onClose} disabled={sending}>Hủy</Button>
        <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => form.submit()}
          disabled={deliveryUnknown || !config?.available || !!blocked}>Gửi email</Button>
      </Space>
    </div>}>
    <dl className="crm-email-addresses">
      <div><dt>Đến</dt><dd><span className="crm-email-name">{lead.full_name}</span><span>{lead.email}</span></dd></div>
      <div><dt>Từ</dt><dd>{config?.from || (configError || config ? 'Chưa kết nối email trung tâm' : <Space size="small"><Spin size="small" />Đang tải người gửi…</Space>)}</dd></div>
    </dl>
    {(configError || blocked || error || config && !config.available) && <div className="crm-email-notices">
      {configError ? <Alert type="error" showIcon message={configError} action={<Button onClick={loadConfig}>Thử lại</Button>} />
        : config && <LeadEmailNotice available={config.available} />}
      {blocked && <Alert type="warning" showIcon message={blocked} />}
      {error && <Alert type={deliveryUnknown ? 'warning' : 'error'} showIcon message={error}
        description={deliveryUnknown ? 'Chỉ gửi lại nếu thư chưa có trong mục Đã gửi của Gmail trung tâm.' : undefined} />}
      {deliveryUnknown && <Button onClick={() => { setDeliveryUnknown(false); setError(''); draft.current = null; }}>Tôi đã kiểm tra Gmail</Button>}
    </div>}
    <Form form={form} className="crm-email-composer" layout="vertical" onFinish={send} disabled={sending}>
      <Form.Item name="subject" className="crm-email-subject" style={{ marginBottom: 0 }}
        rules={[{ required: true, whitespace: true, message: 'Nhập tiêu đề email' }, { max: 200, message: 'Tiêu đề tối đa 200 ký tự' }]}>
        <Input variant="borderless" aria-label="Tiêu đề email" placeholder="Tiêu đề" maxLength={200} />
      </Form.Item>
      <Form.Item name="text" className="crm-email-content" style={{ marginBottom: 0 }}
        rules={[{ required: true, whitespace: true, message: 'Nhập nội dung email' }, { max: 10000, message: 'Nội dung tối đa 10.000 ký tự' }]}>
        <Input.TextArea variant="borderless" aria-label="Nội dung email" placeholder="Nhập nội dung email…"
          autoSize={{ minRows: 12, maxRows: 22 }} maxLength={10000} />
      </Form.Item>
    </Form>
  </Drawer>;
}

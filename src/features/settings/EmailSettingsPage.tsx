import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Input, Space, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../shared/contexts/AuthContext';
import { PageHeader } from '../../shared/components/PageHeader';
import { PageState } from '../../shared/components/PageState';
import { confirmDiscardChanges, formSnapshot } from '../../shared/utils/formChanges';
import { emailSettingsService, type EmailSettings } from '../../services/api/emailSettings.service';

export function EmailSettingsPage() {
  const { user, token } = useAuth();
  return <SettingsForm key={JSON.stringify([user?.id, user?.role, token])} />;
}

function SettingsForm() {
  const [form] = Form.useForm();
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [dirty, setDirty] = useState(false);
  const baseline = useRef(''), busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const apply = (data: EmailSettings) => {
    setSettings(data);
    const values = { sender_name: data.sender_name, sender_email: data.sender_email, app_password: '' };
    form.setFieldsValue(values); baseline.current = formSnapshot(values); setDirty(false);
  };
  const load = async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try { const data = await emailSettingsService.get(controller.signal); if (!controller.signal.aborted) apply(data); }
    catch (err: any) { if (!controller.signal.aborted) setError(err.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  useEffect(() => { load(); return () => request.current?.abort(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (busy.current || !settings?.storage_ready) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const values = await form.validateFields();
      const controller = new AbortController(); request.current = controller;
      const data = await emailSettingsService.save({ sender_name: values.sender_name.trim(), sender_email: values.sender_email.trim(),
        app_password: values.app_password?.replace(/\s/g, '') || undefined, updated_at: settings.updated_at }, controller.signal);
      if (!controller.signal.aborted) { apply(data); message.success('Đã kiểm tra kết nối Gmail và lưu cấu hình.'); }
    } catch (err: any) {
      if (!request.current?.signal.aborted && !err.errorFields) setError(err.message || 'Không lưu được cấu hình email.');
    } finally { busy.current = false; if (!request.current?.signal.aborted) setSaving(false); }
  };

  return <div className="crm-page crm-center-settings-page">
    <PageHeader title="Cài đặt trung tâm" breadcrumbs={[{ title: 'Tổng quan', href: '/dashboard' }, { title: 'Cài đặt trung tâm' }]}
      actions={<Button icon={<ReloadOutlined />} disabled={saving || loading}
        onClick={() => confirmDiscardChanges(dirty, load)}>Tải lại</Button>} />
    {loading ? <PageState loading title="Đang tải cấu hình email..." /> : !settings
      ? <PageState title="Chưa tải được cấu hình email" description={error} onRetry={load} />
      : <Card title="Email chăm sóc" className="crm-center-settings" styles={{ body: { padding: 0 } }}
        extra={<Badge status={settings.storage_ready && settings.has_password ? 'success' : 'default'}
          text={!settings.storage_ready ? 'Chưa sẵn sàng' : settings.has_password ? 'Đã cấu hình' : 'Chưa cấu hình'} />}>
        <Form form={form} layout="horizontal" labelAlign="left" labelWrap colon={false}
          labelCol={{ xs: 24, sm: 7, md: 6 }} wrapperCol={{ xs: 24, sm: 17, md: 18 }}
          disabled={saving || !settings.storage_ready} onFinish={save}
          onValuesChange={() => setDirty(formSnapshot(form.getFieldsValue(true)) !== baseline.current)}>
          <div className="crm-settings-body">
            <div className="crm-settings-meta">
              <span>Gửi email từ tài khoản Gmail của trung tâm.</span>
              {settings.checked_at && <span>Kiểm tra gần nhất: {dayjs(settings.checked_at).format('DD/MM/YYYY HH:mm')}</span>}
            </div>
            {!settings.storage_ready && <Alert className="mb-5" showIcon type="warning" message="Chức năng email chưa được bật trên máy chủ"
              description="Vui lòng liên hệ người triển khai để hoàn tất cấu hình máy chủ." />}
            {error && <Alert className="mb-5" type="error" showIcon message={error} />}
            <Form.Item name="sender_name" label="Tên người gửi" rules={[
                { required: true, whitespace: true, message: 'Nhập tên người gửi' }, { max: 100, message: 'Tối đa 100 ký tự' },
              ]}><Input placeholder="Trung tâm Anh ngữ ABC" maxLength={100} /></Form.Item>
            <Form.Item name="sender_email" label="Gmail gửi" rules={[
                { required: true, whitespace: true, message: 'Nhập email người gửi' }, { type: 'email', transform: value => value?.trim(), message: 'Email không hợp lệ' },
                { max: 255, message: 'Tối đa 255 ký tự' },
              ]}><Input placeholder="trungtam@gmail.com" maxLength={255} /></Form.Item>
            <Form.Item name="app_password" label="Mật khẩu ứng dụng"
              extra={<span>{settings.has_password ? 'Để trống để giữ mật khẩu hiện tại.' : 'Không dùng mật khẩu đăng nhập Gmail.'}{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">Tạo mật khẩu ứng dụng</a></span>}
              rules={[{ required: !settings.has_password, whitespace: true, message: 'Nhập Mật khẩu ứng dụng' },
                { validator: (_, value) => !value || /^[a-zA-Z0-9]{16}$/.test(value.replace(/\s/g, '')) ? Promise.resolve()
                  : Promise.reject(new Error('Mật khẩu ứng dụng gồm 16 ký tự do Google cung cấp.')) }]}>
              <Input.Password autoComplete="new-password" placeholder={settings.has_password ? 'Nhập mật khẩu mới nếu cần thay thế' : 'Mật khẩu ứng dụng 16 ký tự'} />
            </Form.Item>
          </div>
          <div className="crm-settings-footer">
            <span className="crm-settings-note" role="status">{dirty ? 'Có thay đổi chưa lưu' : 'Kiểm tra kết nối không gửi email thử.'}</span>
            <Space wrap>
              <Button disabled={saving || !dirty} onClick={() => confirmDiscardChanges(dirty, () => { apply(settings); setError(''); })}>Hủy thay đổi</Button>
              <Button type="primary" loading={saving} onClick={save}>{dirty || !settings.has_password ? 'Kiểm tra và lưu' : 'Kiểm tra lại'}</Button>
            </Space>
          </div>
        </Form>
      </Card>}
  </div>;
}

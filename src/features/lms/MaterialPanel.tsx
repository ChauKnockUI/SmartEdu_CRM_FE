import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Upload, message } from 'antd';
import { DownloadOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { materialService, type ClassMaterial, type MaterialList, type MaterialSession } from '../../services/api/material.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { paginationProps } from '../../shared/utils/pagination';

type Props = { classId: number; scheduleId?: never } | { scheduleId: number; classId?: never };
const CHANGED = 'crm:materials-changed';
const time = (value: string | null) => value?.match(/(?:^|T)(\d{2}:\d{2})/)?.[1] || '--:--';
const sessionLabel = (session: MaterialSession) => `Buổi ${dayjs(session.date).format('DD/MM/YYYY')} · ${time(session.start_time)}–${time(session.end_time)}${session.status === 'cancelled' ? ' (nghỉ)' : ''}`;
const accepted = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip,.mp3,.mp4';

export function MaterialPanel(props: Props) {
  const { user, token } = useAuth();
  return <MaterialPanelContent key={JSON.stringify([user?.id, user?.role, token, props.classId, props.scheduleId])} {...props} />;
}

function MaterialPanelContent({ classId, scheduleId }: Props) {
  const [listing, setListing] = useState<MaterialList | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(''), [filter, setFilter] = useState<string | number>(scheduleId || 'all');
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<ClassMaterial | null>(null), [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false), [deleting, setDeleting] = useState<number>(), [downloading, setDownloading] = useState<number>();
  const busy = useRef(false), alive = useRef(true);
  const [form] = Form.useForm();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const request = scheduleId ? materialService.getBySession(scheduleId, controller.signal) : materialService.getByClass(classId!, controller.signal);
    request.then(result => { if (!controller.signal.aborted) setListing(result); })
      .catch(err => { if (!controller.signal.aborted) { setListing(null); setError(err.message || 'Không tải được tài liệu.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [classId, scheduleId, revision]);
  useEffect(() => {
    const changed = (event: Event) => {
      if ((event as CustomEvent).detail?.classId === listing?.class_id) setRevision(value => value + 1);
    };
    window.addEventListener(CHANGED, changed);
    return () => window.removeEventListener(CHANGED, changed);
  }, [listing?.class_id]);

  const scopeOptions = [
    { value: 'common', label: 'Chung cả lớp' },
    ...(listing?.schedules || []).map(session => ({ value: session.id, label: sessionLabel(session) })),
  ];
  const uploadOptions = scopeOptions.filter(option => option.value === 'common' ? listing?.can_upload_common
    : listing?.can_upload_schedule_ids.includes(Number(option.value)));
  const filtered = useMemo(() => (listing?.data || []).filter(item =>
    (filter === 'all' || filter === 'common' && item.schedule_id === null || item.schedule_id === filter)
    && (item.title + ' ' + item.file_name).toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
  ), [listing, filter, search]);

  const beginEdit = (item?: ClassMaterial) => {
    setEditing(item || null); setFile(null); form.resetFields();
    form.setFieldsValue({ title: item?.title || '', scope: item ? item.schedule_id ?? 'common'
      : scheduleId || (typeof filter === 'number' && uploadOptions.some(option => option.value === filter) ? filter : listing?.can_upload_common ? 'common' : uploadOptions[0]?.value) });
    setOpen(true);
  };
  const changed = () => {
    setPage(1);
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: { classId: listing?.class_id } }));
  };
  const save = async () => {
    if (busy.current || !listing) return;
    let values;
    try { values = await form.validateFields(); } catch { return; }
    if (!file && !editing) { message.warning('Vui lòng chọn file.'); return; }
    if (busy.current || !alive.current) return;
    busy.current = true; setSaving(true);
    try {
      const payload = { title: values.title.trim(), schedule_id: values.scope === 'common' ? null : Number(values.scope), file: file || undefined };
      if (editing) await materialService.update(editing.id, payload);
      else await materialService.upload(listing.class_id, { ...payload, file: file! });
      if (!alive.current) return;
      message.success(editing ? 'Đã cập nhật tài liệu.' : 'Đã tải tài liệu lên.');
      setOpen(false); setFile(null); setSearch(''); setFilter('all'); changed();
    } catch (err: any) { if (alive.current) message.error(err.message || 'Không lưu được tài liệu.'); }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  };
  const remove = async (item: ClassMaterial) => {
    if (busy.current) return;
    busy.current = true; setDeleting(item.id);
    try {
      await materialService.remove(item.id);
      if (alive.current) { message.success('Đã xóa tài liệu.'); changed(); }
    } catch (err: any) { if (alive.current) message.error(err.message || 'Không xóa được tài liệu.'); }
    finally { busy.current = false; if (alive.current) setDeleting(undefined); }
  };
  const download = async (item: ClassMaterial) => {
    if (downloading !== undefined) return;
    setDownloading(item.id);
    try {
      const result = await materialService.getDownloadUrl(item.id);
      if (!alive.current) return;
      const link = document.createElement('a');
      link.href = result.data.url; link.download = item.file_name; link.rel = 'noopener';
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err: any) { if (alive.current) message.error(err.message || 'Không tải được file.'); }
    finally { if (alive.current) setDownloading(undefined); }
  };

  return <Card title={scheduleId ? 'Tài liệu buổi học' : 'Tài liệu'} extra={<Space wrap>
    <Button icon={<ReloadOutlined />} loading={loading} disabled={saving || deleting !== undefined} onClick={() => setRevision(value => value + 1)}>Tải lại</Button>
    {uploadOptions.length > 0 && <Button type="primary" icon={<UploadOutlined />} disabled={loading || deleting !== undefined} onClick={() => beginEdit()}>Tải lên</Button>}
  </Space>}>
    {error && <Alert className="mb-4" type="error" showIcon message={error} action={<Button onClick={() => setRevision(value => value + 1)}>Thử lại</Button>} />}
    <Space wrap className="crm-filter-controls mb-4">
      <Input className="crm-filter-search" aria-label="Tìm tài liệu" placeholder="Tên tài liệu, tên file" allowClear value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <Select className="crm-filter-select" aria-label="Phạm vi tài liệu" showSearch optionFilterProp="label" popupMatchSelectWidth={320}
        value={filter} options={[{ value: 'all', label: 'Tất cả tài liệu' }, ...scopeOptions]} onChange={value => { setFilter(value); setPage(1); }} />
    </Space>
    <Table<ClassMaterial> rowKey="id" loading={loading} dataSource={filtered} scroll={{ x: 800 }}
      locale={{ emptyText: error ? 'Chưa tải được tài liệu' : 'Chưa có tài liệu phù hợp' }}
      pagination={paginationProps('tài liệu', { current: Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize))), pageSize,
        total: filtered.length, onChange: (next, size) => { setPage(size === pageSize ? next : 1); setPageSize(size); } })}
      columns={[
        { title: 'Tài liệu', width: 280, render: (_, item) => <><strong>{item.title}</strong><div className="text-xs text-gray-500">{item.file_name}{item.file_size != null && ` · ${(item.file_size / 1024 / 1024).toFixed(2)} MB`}</div></> },
        { title: 'Phạm vi', width: 210, render: (_, item) => item.schedule ? sessionLabel(item.schedule) : 'Chung cả lớp' },
        { title: 'Tải lên', width: 150, render: (_, item) => <>{dayjs(item.created_at).format('DD/MM/YYYY')}<div className="text-xs text-gray-500">{item.users?.full_name}</div></> },
        { title: 'Thao tác', width: 230, render: (_, item) => <Space wrap>
          <Button size="small" icon={<DownloadOutlined />} loading={downloading === item.id} disabled={downloading !== undefined && downloading !== item.id} onClick={() => download(item)}>Tải về</Button>
          {item.can_manage && <><Button size="small" disabled={saving || deleting !== undefined} onClick={() => beginEdit(item)}>Sửa</Button>
            <Popconfirm title="Xóa tài liệu này?" description="Tài liệu sẽ bị gỡ ở cả trang lớp và buổi học." okText="Xóa" cancelText="Hủy" onConfirm={() => remove(item)}>
              <Button size="small" danger loading={deleting === item.id} disabled={saving || deleting !== undefined && deleting !== item.id}>Xóa</Button>
            </Popconfirm></>}
        </Space> },
      ]} />
    <Modal title={editing ? 'Chỉnh sửa tài liệu' : 'Tải tài liệu lên'} open={open} confirmLoading={saving}
      okText={editing ? 'Lưu' : 'Tải lên'} cancelText="Hủy" onOk={save} onCancel={() => { if (!busy.current) setOpen(false); }}
      closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }}>
      <Form form={form} layout="vertical" disabled={saving}>
        <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true, whitespace: true, max: 200, message: 'Nhập tên tài liệu từ 1 đến 200 ký tự.' }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="scope" label="Dùng cho" rules={[{ required: true, message: 'Chọn phạm vi tài liệu.' }]}>
          <Select options={uploadOptions} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label={editing ? 'Thay file (không bắt buộc)' : 'File tài liệu'} required={!editing} extra="Tối đa 20 MB/file. PDF, Office, ảnh, TXT, ZIP, MP3, MP4.">
          {editing && !file && <div className="mb-2 text-sm text-gray-500">Giữ file hiện tại: {editing.file_name}</div>}
          <Upload accept={accepted} maxCount={1} disabled={saving} fileList={file ? [{ uid: 'selected', name: file.name }] : []}
            onRemove={() => { setFile(null); return true; }} beforeUpload={selected => {
              if (selected.size <= 0 || selected.size > 20 * 1024 * 1024) { message.error('Chọn file có nội dung, tối đa 20 MB.'); return Upload.LIST_IGNORE; }
              if (!accepted.split(',').some(ext => selected.name.toLowerCase().endsWith(ext))) { message.error('Định dạng file không được hỗ trợ.'); return Upload.LIST_IGNORE; }
              setFile(selected);
              if (!form.getFieldValue('title')?.trim()) form.setFieldsValue({ title: selected.name.replace(/\.[^.]+$/, '').slice(0, 200) });
              return false;
            }}><Button icon={<UploadOutlined />} disabled={saving}>Chọn file</Button></Upload>
        </Form.Item>
      </Form>
    </Modal>
  </Card>;
}

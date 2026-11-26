import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Dropdown, Form, Grid, Input, Modal, Select, Space, Table, Tooltip, Upload, message } from 'antd';
import { DownloadOutlined, FileTextOutlined, MoreOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router';
import { downloadMaterial, materialFileSize, materialSessionLabel as sessionLabel, materialService, type ClassMaterial, type MaterialList } from '../../services/api/material.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { paginationProps } from '../../shared/utils/pagination';
import { confirmDiscardChanges, formSnapshot } from '../../shared/utils/formChanges';

type Props = { classId: number; scheduleId?: never } | { scheduleId: number; classId?: never };
const CHANGED = 'crm:materials-changed';
const accepted = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip,.mp3,.mp4';

export function MaterialPanel(props: Props) {
  const { user, token } = useAuth();
  return <MaterialPanelContent key={JSON.stringify([user?.id, user?.role, token, props.classId, props.scheduleId])} {...props} />;
}

function MaterialPanelContent({ classId, scheduleId }: Props) {
  const [params] = useSearchParams();
  const requested = params.get('material_scope');
  const [listing, setListing] = useState<MaterialList | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(''), [filter, setFilter] = useState<string | number>(() => requested === 'common' ? 'common'
    : requested && /^[1-9]\d*$/.test(requested) ? Number(requested) : scheduleId || 'all');
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<ClassMaterial | null>(null), [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false), [deleting, setDeleting] = useState<number>(), [downloading, setDownloading] = useState<number>();
  const busy = useRef(false), alive = useRef(true), original = useRef(''), downloadBusy = useRef(false);
  const screens = Grid.useBreakpoint();
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
    original.current = formSnapshot(form.getFieldsValue(true)); setOpen(true);
  };
  const close = () => {
    if (busy.current) return;
    confirmDiscardChanges(!!file || formSnapshot(form.getFieldsValue(true)) !== original.current, () => {
      if (alive.current && !busy.current) setOpen(false);
    });
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
    if (downloadBusy.current) return;
    downloadBusy.current = true;
    setDownloading(item.id);
    try {
      await downloadMaterial(item.id, item.file_name);
    } catch (err: any) { if (alive.current) message.error(err.message || 'Không tải được file.'); }
    finally { downloadBusy.current = false; if (alive.current) setDownloading(undefined); }
  };

  return <Card className="crm-material-panel" title={scheduleId ? 'Tài liệu buổi học' : 'Tài liệu lớp học'} extra={<Space wrap>
    <Button icon={<ReloadOutlined />} loading={loading} disabled={saving || deleting !== undefined} onClick={() => setRevision(value => value + 1)}>Tải lại</Button>
    {uploadOptions.length > 0 && <Button type="primary" icon={<UploadOutlined />} disabled={loading || deleting !== undefined} onClick={() => beginEdit()}>Tải lên</Button>}
  </Space>}>
    {error && <Alert className="mb-4" type="error" showIcon message={error} action={<Button onClick={() => setRevision(value => value + 1)}>Thử lại</Button>} />}
    <Space wrap className="crm-filter-controls mb-4">
      <Input className="crm-filter-search" aria-label="Tìm tài liệu" placeholder="Tên tài liệu, tên file" allowClear value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <Select className="crm-filter-select" aria-label="Phạm vi tài liệu" showSearch optionFilterProp="label" popupMatchSelectWidth={320}
        value={filter} options={[{ value: 'all', label: 'Tất cả tài liệu' }, ...scopeOptions]} onChange={value => { setFilter(value); setPage(1); }} />
    </Space>
    <Table<ClassMaterial> rowKey="id" loading={loading} dataSource={filtered} tableLayout="fixed" scroll={screens.md ? { x: 850 } : undefined}
      locale={{ emptyText: error ? 'Chưa tải được tài liệu' : 'Chưa có tài liệu phù hợp' }}
      pagination={paginationProps('tài liệu', { current: Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize))), pageSize,
        total: filtered.length, onChange: (next, size) => { setPage(size === pageSize ? next : 1); setPageSize(size); } })}
      columns={[
        { title: 'Tài liệu', width: screens.md ? 280 : undefined, render: (_, item) => <div className="crm-material-copy">
          <div className="crm-material-title"><FileTextOutlined /><strong>{item.title}</strong></div>
          <div className="crm-material-meta">{item.file_name}{item.file_size != null && ` · ${materialFileSize(item.file_size)}`}</div>
          {!screens.md && <div className="crm-material-meta">{item.schedule ? sessionLabel(item.schedule) : 'Chung cả lớp'}</div>}
        </div> },
        { title: 'Phạm vi', width: 230, responsive: ['md'], render: (_, item) => item.schedule ? sessionLabel(item.schedule) : 'Chung cả lớp' },
        { title: 'Người tải lên', width: 160, responsive: ['lg'], render: (_, item) => <>{item.users?.full_name || '—'}<div className="crm-material-meta">{dayjs(item.created_at).format('DD/MM/YYYY')}</div></> },
        { title: 'Thao tác', width: screens.md ? 170 : 90, render: (_, item) => <Space size={4}>
          <Tooltip title="Tải về"><Button size="small" aria-label={`Tải về ${item.title}`} icon={<DownloadOutlined />} loading={downloading === item.id} disabled={downloading !== undefined && downloading !== item.id} onClick={() => download(item)}>{screens.md ? 'Tải về' : null}</Button></Tooltip>
          {item.can_manage && <Dropdown trigger={['click']} menu={{ items: [
            { key: 'edit', label: 'Chỉnh sửa', onClick: () => beginEdit(item) },
            { key: 'delete', label: 'Xóa tài liệu', danger: true, onClick: () => Modal.confirm({ title: 'Xóa tài liệu này?',
              content: 'Tài liệu sẽ bị gỡ ở cả trang lớp và buổi học.', okText: 'Xóa', cancelText: 'Hủy', okButtonProps: { danger: true }, onOk: () => remove(item) }) },
          ] }}><Button size="small" aria-label={`Quản lý ${item.title}`} icon={<MoreOutlined />} loading={deleting === item.id} disabled={saving || loading || deleting !== undefined} /></Dropdown>}
        </Space> },
      ]} />
    <Modal title={editing ? 'Chỉnh sửa tài liệu' : 'Tải tài liệu lên'} open={open} confirmLoading={saving}
      okText={editing ? 'Lưu' : 'Tải lên'} cancelText="Hủy" onOk={save} onCancel={close}
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

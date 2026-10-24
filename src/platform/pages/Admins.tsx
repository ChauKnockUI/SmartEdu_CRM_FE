import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, type PlatformAdmin } from '../lib/api';
import { usePlatformAuth } from '../lib/auth';
import { fmtDate } from '../lib/format';
import { useQuery } from '../lib/useQuery';
import { act, Avatar, Button, Empty, ErrorBlock, Field, KebabMenu, Modal, Pill, Skel, Switch } from '../ui';

const MIN_PW = 12;

function CreateAdminModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ name: '', email: '', password: '' }); setError(null); } }, [open]);
  const valid = f.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= MIN_PW;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!valid) return;
    setBusy(true); setError(null);
    try {
      await api.createAdmin({ full_name: f.name.trim(), email: f.email.trim(), password: f.password });
      toast.success('Đã thêm quản trị viên'); onDone(); onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Thêm quản trị viên" description="Quản trị viên nền tảng có toàn quyền trên mọi trung tâm."
      footer={<><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} disabled={!valid} type="submit" form="admin-new">Thêm</Button></>}>
      <form id="admin-new" className="pf-form" onSubmit={submit} autoComplete="off">
        <Field label="Họ tên">{(id) => <input id={id} className="pf-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />}</Field>
        <Field label="Email đăng nhập">{(id) => <input id={id} className="pf-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Mật khẩu ban đầu" hint={`Tối thiểu ${MIN_PW} ký tự. Gửi qua kênh an toàn và yêu cầu đổi ngay.`} error={f.password && f.password.length < MIN_PW ? `Còn thiếu ${MIN_PW - f.password.length} ký tự` : null}>
          {(id) => <input id={id} className="pf-input" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />}
        </Field>
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

function RenameModal({ admin, onClose, onDone }: { admin: PlatformAdmin | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (admin) { setName(admin.full_name); setError(null); } }, [admin]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!admin) return;
    setBusy(true); setError(null);
    try { await api.updateAdmin(admin.id, { full_name: name.trim() }); toast.success('Đã lưu tên'); onDone(); onClose(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!admin} onClose={onClose} title="Sửa tên quản trị viên" description={admin?.email}
      footer={<><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} disabled={name.trim().length < 2} type="submit" form="admin-rename">Lưu</Button></>}>
      <form id="admin-rename" className="pf-form" onSubmit={submit}>
        <Field label="Họ tên">{(id) => <input id={id} className="pf-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />}</Field>
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

export function AdminsPage() {
  const { admin: me } = usePlatformAuth();
  const q = useQuery(() => api.admins(), []);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<PlatformAdmin | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggle = async (a: PlatformAdmin, next: boolean) => {
    setBusyId(a.id);
    const ok = await act(() => api.updateAdmin(a.id, { is_active: next }), next ? `Đã kích hoạt ${a.full_name}` : `Đã vô hiệu hóa ${a.full_name}`);
    setBusyId(null);
    if (ok) q.reload();
  };
  const activeCount = q.data?.filter((a) => a.is_active).length ?? 0;

  return (
    <div className="pf-page">
      <div className="pf-titlerow">
        <div>
          <h1>Quản trị viên</h1>
          <p className="sub">Người có quyền vào console này. Tài khoản bị vô hiệu hóa mất quyền ở yêu cầu kế tiếp.</p>
        </div>
        <div className="pf-actions"><Button variant="primary" onClick={() => setCreating(true)}><Plus />Thêm quản trị viên</Button></div>
      </div>

      <div className="pf-grid">
      <div className="pf-stack" style={{ gap: 12 }}>
      {q.error && !q.data ? <ErrorBlock error={q.error} onRetry={q.reload} what="danh sách quản trị viên" /> : (
        <div className="pf-tablewrap">
          <table className="pf-table">
            <thead><tr><th>Quản trị viên</th><th className="hide-sm">Trạng thái</th><th className="hide-sm num">Ngày tạo</th><th className="num">Hoạt động</th><th /></tr></thead>
            <tbody>
              {q.loading && [0, 1].map((i) => <tr key={i}><td><Skel w="50%" /></td><td className="hide-sm"><Skel w={80} /></td><td className="hide-sm"><Skel w={80} /></td><td><Skel w={32} /></td><td /></tr>)}
              {q.data?.map((a) => {
                const self = a.id === me?.id;
                const lastActive = a.is_active && activeCount <= 1;
                return (
                  <tr key={a.id} className={a.is_active ? '' : 'dim'}>
                    <td><div className="ident"><Avatar name={a.full_name} /><div><b>{a.full_name}{self && <span className="muted" style={{ fontWeight: 400 }}> (bạn)</span>}</b><span className="s">{a.email}</span></div></div></td>
                    <td className="hide-sm">{a.is_active ? <Pill tone="active">Đang hoạt động</Pill> : <Pill>Đã vô hiệu hóa</Pill>}</td>
                    <td className="hide-sm num">{fmtDate(a.createdAt)}</td>
                    <td className="num"><span style={{ display: 'inline-flex' }} title={self ? 'Không thể tự vô hiệu hóa chính mình' : lastActive ? 'Phải còn ít nhất một quản trị viên hoạt động' : undefined}>
                      <Switch checked={!!a.is_active} label={`${a.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} ${a.full_name}`} disabled={busyId === a.id || (self && !!a.is_active) || lastActive} onChange={(v) => toggle(a, v)} />
                    </span></td>
                    <td className="actions"><KebabMenu label={`Thao tác với ${a.full_name}`} items={[{ label: 'Sửa tên', icon: <Pencil />, onSelect: () => setRenaming(a) }]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {q.data && q.data.length === 0 && <Empty>Chưa có quản trị viên nào.</Empty>}
      </div>

      <aside className="pf-card" aria-labelledby="rules-h">
        <div className="pf-card-head"><h2 id="rules-h">Quy định truy cập</h2></div>
        <div className="pf-card-body">
          <ul className="pf-rules">
            <li><b>Toàn quyền trên mọi trung tâm</b><span>Tạo, tạm ngưng, đổi gói, đặt lại mật khẩu người dùng của trung tâm.</span></li>
            <li><b>Phiên đăng nhập 8 giờ</b><span>Hết hạn thì phải đăng nhập lại.</span></li>
            <li><b>Mật khẩu tối thiểu 12 ký tự</b><span>Áp dụng khi tạo tài khoản và khi đổi mật khẩu.</span></li>
            <li><b>Vô hiệu hóa có hiệu lực ngay</b><span>Tài khoản bị khóa mất quyền ở yêu cầu kế tiếp.</span></li>
            <li><b>Không tự khóa chính mình</b><span>Nên luôn còn ít nhất một quản trị viên hoạt động.</span></li>
            <li><b>Mọi thao tác ghi đều có nhật ký</b><span>Ghi ở nhật ký máy chủ, không chứa mật khẩu.</span></li>
          </ul>
        </div>
      </aside>
      </div>

      <CreateAdminModal open={creating} onClose={() => setCreating(false)} onDone={q.reload} />
      <RenameModal admin={renaming} onClose={() => setRenaming(null)} onDone={q.reload} />
    </div>
  );
}

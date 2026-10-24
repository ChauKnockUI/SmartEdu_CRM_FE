import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, tokenExpiry, tokenStore } from '../lib/api';
import { usePlatformAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';
import { Button, Field } from '../ui';

const MIN_PW = 12;

export function AccountPage() {
  const { admin, logout } = usePlatformAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exp = tokenExpiry(tokenStore.get());
  const mismatch = again.length > 0 && again !== next;
  const valid = cur.length > 0 && next.length >= MIN_PW && next === again && next !== cur;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!valid) return;
    setBusy(true); setError(null);
    try {
      await api.changePassword(cur, next);
      toast.success('Đã đổi mật khẩu');
      setCur(''); setNext(''); setAgain('');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="pf-page">
      <div className="pf-titlerow">
        <div>
          <h1>Tài khoản</h1>
          <p className="sub">Thông tin đăng nhập và bảo mật của bạn trên console Super Admin.</p>
        </div>
      </div>

      <div className="pf-settings">
        <section className="pf-srow" aria-labelledby="acc-h">
          <div><h2 id="acc-h">Hồ sơ</h2><p className="desc">Tên và email dùng để đăng nhập. Nhờ quản trị viên khác nếu cần đổi.</p></div>
          <div className="pf-panel">
            <dl className="pf-dl" style={{ gridTemplateColumns: '120px 1fr' }}>
              <dt>Họ tên</dt><dd>{admin?.full_name}</dd>
              <dt>Email</dt><dd>{admin?.email}</dd>
              <dt>Phiên hiện tại</dt><dd>{exp ? <>Hết hạn lúc {fmtDateTime(new Date(exp).toISOString())}</> : '—'}</dd>
            </dl>
            <div style={{ marginTop: 16 }}><Button onClick={logout}>Đăng xuất</Button></div>
          </div>
        </section>

        <section className="pf-srow" aria-labelledby="pw-h">
          <div><h2 id="pw-h">Đổi mật khẩu</h2><p className="desc">Mật khẩu mới tối thiểu {MIN_PW} ký tự và khác mật khẩu hiện tại. Phiên đang mở vẫn dùng được đến khi hết hạn.</p></div>
          <form className="pf-panel pf-form" onSubmit={submit}>
            <Field label="Mật khẩu hiện tại">{(id) => <input id={id} className="pf-input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>
            <Field label="Mật khẩu mới" error={next && next.length < MIN_PW ? `Còn thiếu ${MIN_PW - next.length} ký tự` : next && next === cur ? 'Phải khác mật khẩu hiện tại' : null}>
              {(id) => <input id={id} className="pf-input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
            </Field>
            <Field label="Nhập lại mật khẩu mới" error={mismatch ? 'Không khớp' : null}>
              {(id) => <input id={id} className="pf-input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}
            </Field>
            {error && <span className="err" role="alert" style={{ color: 'var(--negative)', fontSize: 12 }}>{error}</span>}
            <div><Button variant="primary" type="submit" loading={busy} disabled={!valid}>Đổi mật khẩu</Button></div>
          </form>
        </section>
      </div>
    </div>
  );
}

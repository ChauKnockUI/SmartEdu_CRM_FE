import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { usePlatformAuth } from '../lib/auth';
import { BrandMark } from '../Shell';
import { Button, Field } from '../ui';

export function LoginPage() {
  const { status, login, notice } = usePlatformAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authed') return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(email.trim(), password);
      nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="pf pf-auth">
      <aside className="pf-auth-side">
        <div className="pf-brand"><BrandMark size={40} /><div><div className="pf-brand-name">SmartEdu</div><div className="pf-brand-scope">Quản trị nền tảng</div></div></div>
        <p className="pf-auth-pitch">Mọi trung tâm, gói dịch vụ và kỳ gia hạn trong một màn hình.</p>
        <ul className="pf-auth-points">
          <li><Check aria-hidden />Theo dõi MRR và hạn gia hạn sắp đến</li>
          <li><Check aria-hidden />Tạo trung tâm mới, kèm tài khoản quản trị đầu tiên</li>
          <li><Check aria-hidden />Hỗ trợ người dùng: kích hoạt, đặt lại mật khẩu</li>
        </ul>
      </aside>
      <div className="pf-auth-main">
      <div className="pf-auth-panel">
        <BrandMark size={36} />
        <h1>Đăng nhập Super Admin</h1>
        <p className="desc">Khu vực dành cho quản trị viên nền tảng SmartEdu. Phiên làm việc kéo dài 8 giờ.</p>
        <form className="pf-form" onSubmit={submit}>
          {notice && !error && <p className="pf-notice" role="status">{notice}</p>}
          {error && <p className="pf-error" role="alert">{error}</p>}
          <Field label="Email">
            {(id) => <input id={id} className="pf-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />}
          </Field>
          <Field label="Mật khẩu">
            {(id) => <input id={id} className="pf-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
          </Field>
          <Button variant="primary" type="submit" loading={busy} disabled={!email || !password}>Đăng nhập</Button>
        </form>
      </div>
      <p className="pf-auth-foot">Token của người dùng trung tâm không dùng được ở đây.</p>
      </div>
    </div>
  );
}

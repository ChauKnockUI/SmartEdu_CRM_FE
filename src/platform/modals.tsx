import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, type Plan, type TenantStatus } from './lib/api';
import { baseDomain, fmtDate, num, toNumber } from './lib/format';
import { useDebounced, useQuery } from './lib/useQuery';
import { Button, Field, Modal } from './ui';

const DAY = 86_400_000;

/* ─── Gia hạn ───────────────────────────────────────────────────────────── */
export function ExtendModal({ open, onClose, onDone, tenant, currentEnd }: {
  open: boolean; onClose: () => void; onDone: () => void;
  tenant: { id: number; name: string; status: TenantStatus };
  /** Ngày hết hạn hiện tại (kỳ đang chạy hoặc hạn dùng thử), nếu biết. */
  currentEnd?: string | null;
}) {
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setDays(7); setError(null); } }, [open]);

  const valid = Number.isInteger(days) && days >= 1 && days <= 365;
  const base = currentEnd ? Math.max(new Date(currentEnd).getTime(), Date.now()) : null;
  const trial = tenant.status === 'trial';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true); setError(null);
    try {
      await api.extend(tenant.id, days);
      toast.success(`Đã gia hạn ${tenant.name} thêm ${days} ngày`);
      onDone(); onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Gia hạn ${tenant.name}`}
      description={trial ? 'Cộng thêm ngày vào hạn dùng thử.' : 'Cộng thêm ngày vào kỳ đăng ký đang chạy. Không tính thêm tiền.'}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Hủy</Button>
        <Button variant="primary" loading={busy} disabled={!valid} type="submit" form="extend-form">Gia hạn {valid ? `${days} ngày` : ''}</Button>
      </>}>
      <form id="extend-form" className="pf-form" onSubmit={submit}>
        <div className="pf-segment" role="group" aria-label="Số ngày gia hạn nhanh">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d} ngày</button>
          ))}
        </div>
        <Field label="Số ngày" hint="Từ 1 đến 365 ngày." error={valid ? null : 'Nhập số nguyên từ 1 đến 365'}>
          {(id) => <input id={id} className="pf-input" type="number" min={1} max={365} value={Number.isNaN(days) ? '' : days}
            onChange={(e) => setDays(e.target.value === '' ? NaN : Number(e.target.value))} />}
        </Field>
        {valid && base !== null && (
          <p className="pf-info">Hạn hiện tại {fmtDate(currentEnd)} → hạn mới <strong>{fmtDate(new Date(base + days * DAY).toISOString())}</strong></p>
        )}
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

/* ─── Đổi / nâng gói ────────────────────────────────────────────────────── */
export function ChangePlanModal({ open, onClose, onDone, tenant, usage }: {
  open: boolean; onClose: () => void; onDone: () => void;
  tenant: { id: number; name: string; status: TenantStatus; plan_id: number | null };
  usage?: { users: number; students: number };
}) {
  const plans = useQuery(() => api.plans(), []);
  const sellable = useMemo(() => (plans.data ?? []).filter((p) => p.is_active), [plans.data]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setPlanId(tenant.plan_id); setMonths(1); setError(null); } }, [open, tenant.plan_id]);
  useEffect(() => {
    if (open && planId === null && sellable.length) setPlanId(sellable[0].id);
  }, [open, planId, sellable]);

  const plan: Plan | undefined = sellable.find((p) => p.id === planId);
  const validMonths = Number.isInteger(months) && months >= 1 && months <= 36;
  const amount = plan ? toNumber(plan.price_monthly) * (validMonths ? months : 0) : 0;
  const end = new Date(); end.setMonth(end.getMonth() + (validMonths ? months : 0));
  const overStudents = plan?.max_students != null && usage && usage.students > plan.max_students;
  const overUsers = plan?.max_users != null && usage && usage.users > plan.max_users;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!plan || !validMonths) return;
    setBusy(true); setError(null);
    try {
      await api.changePlan(tenant.id, plan.id, months);
      toast.success(`Đã chuyển ${tenant.name} sang gói ${plan.name}`);
      onDone(); onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Đổi gói cho ${tenant.name}`}
      description="Kỳ đăng ký đang chạy sẽ bị hủy và kỳ mới bắt đầu ngay hôm nay."
      footer={<>
        <Button onClick={onClose} disabled={busy}>Hủy</Button>
        <Button variant="primary" loading={busy} disabled={!plan || !validMonths} type="submit" form="plan-form">Xác nhận đổi gói</Button>
      </>}>
      <form id="plan-form" className="pf-form" onSubmit={submit}>
        <Field label="Gói dịch vụ" error={plans.error?.message}>
          {(id) => (
            <select id={id} className="pf-select" value={planId ?? ''} onChange={(e) => setPlanId(Number(e.target.value))} disabled={plans.loading}>
              {sellable.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {num(p.price_monthly)} ₫/tháng{p.id === tenant.plan_id ? ' (hiện tại)' : ''}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Thời hạn" error={validMonths ? null : 'Nhập từ 1 đến 36 tháng'}>
          {(id) => (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="pf-segment" role="group" aria-label="Thời hạn nhanh">
                {[1, 3, 6, 12].map((m) => <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>{m} tháng</button>)}
              </div>
              <input id={id} className="pf-input sm" style={{ width: 88 }} type="number" min={1} max={36} value={Number.isNaN(months) ? '' : months}
                onChange={(e) => setMonths(e.target.value === '' ? NaN : Number(e.target.value))} aria-label="Số tháng" />
            </div>
          )}
        </Field>
        {plan && validMonths && (
          <dl className="pf-dl" style={{ gridTemplateColumns: '120px 1fr' }}>
            <dt>Thành tiền</dt><dd><strong>{num(amount)} ₫</strong> <span className="muted">({num(plan.price_monthly)} ₫ × {months} tháng)</span></dd>
            <dt>Kỳ mới</dt><dd>{fmtDate(new Date().toISOString())} → {fmtDate(end.toISOString())}</dd>
            {tenant.status === 'trial' && (<><dt>Trạng thái</dt><dd>Dùng thử → Đang hoạt động</dd></>)}
          </dl>
        )}
        {(overStudents || overUsers) && (
          <p className="pf-notice">
            Trung tâm đang vượt giới hạn của gói này:
            {overStudents && ` ${num(usage!.students)} học viên (tối đa ${num(plan!.max_students)})`}
            {overStudents && overUsers && ';'}
            {overUsers && ` ${num(usage!.users)} người dùng (tối đa ${num(plan!.max_users)})`}.
            Vẫn có thể đổi gói.
          </p>
        )}
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

/* ─── Tạo trung tâm ─────────────────────────────────────────────────────── */
type Avail = { state: 'idle' } | { state: 'checking' } | { state: 'ok' } | { state: 'bad'; reason: string };

export function CreateTenantModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (tenantId: number) => void;
}) {
  const plans = useQuery(() => api.plans(), []);
  const sellable = useMemo(() => (plans.data ?? []).filter((p) => p.is_active), [plans.data]);

  const empty = { name: '', subdomain: '', plan_id: '', contact_email: '', contact_phone: '', admin_name: '', admin_email: '', admin_password: '' };
  const [f, setF] = useState(empty);
  const [avail, setAvail] = useState<Avail>({ state: 'idle' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => { if (open) { setF(empty); setAvail({ state: 'idle' }); setError(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const sub = useDebounced(f.subdomain.trim().toLowerCase(), 350);
  useEffect(() => {
    if (!sub) { setAvail({ state: 'idle' }); return; }
    let alive = true;
    setAvail({ state: 'checking' });
    api.checkSubdomain(sub)
      .then((r) => { if (alive) setAvail(r.available ? { state: 'ok' } : { state: 'bad', reason: r.reason ?? 'Subdomain đã được dùng' }); })
      .catch(() => { if (alive) setAvail({ state: 'idle' }); });
    return () => { alive = false; };
  }, [sub]);

  const pwOk = f.admin_password.length >= 8;
  const ready = f.name.trim().length >= 2 && f.subdomain.trim() && avail.state === 'ok' && sub === f.subdomain.trim().toLowerCase()
    && f.admin_name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.admin_email) && pwOk;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError(null);
    try {
      const res = await api.createTenant({
        name: f.name.trim(),
        subdomain: f.subdomain.trim().toLowerCase(),
        ...(f.plan_id ? { plan_id: Number(f.plan_id) } : {}),
        ...(f.contact_email.trim() ? { contact_email: f.contact_email.trim() } : {}),
        ...(f.contact_phone.trim() ? { contact_phone: f.contact_phone.trim() } : {}),
        admin: { email: f.admin_email.trim(), password: f.admin_password, full_name: f.admin_name.trim() },
      });
      toast.success(`Đã tạo ${res.tenant.name}, dùng thử 14 ngày`);
      onClose();
      onCreated(res.tenant.id);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal wide open={open} onClose={onClose} title="Tạo trung tâm"
      description="Trung tâm mới ở trạng thái dùng thử 14 ngày, kèm tài khoản quản trị đầu tiên."
      footer={<>
        <Button onClick={onClose} disabled={busy}>Hủy</Button>
        <Button variant="primary" loading={busy} disabled={!ready} type="submit" form="tenant-form">Tạo trung tâm</Button>
      </>}>
      <form id="tenant-form" className="pf-form" onSubmit={submit} autoComplete="off">
        <Field label="Tên trung tâm">{(id) => <input id={id} className="pf-input" value={f.name} onChange={set('name')} maxLength={255} autoFocus />}</Field>
        <Field label="Subdomain"
          error={avail.state === 'bad' ? avail.reason : null}
          ok={avail.state === 'ok' ? 'Có thể dùng' : null}
          hint={avail.state === 'checking' ? 'Đang kiểm tra…' : 'Chữ thường, số và dấu gạch ngang.'}>
          {(id) => (
            <div className="pf-input-group">
              <input id={id} className="pf-input" value={f.subdomain} onChange={set('subdomain')} maxLength={63} aria-invalid={avail.state === 'bad'} />
              <span className="suffix">.{baseDomain()}</span>
            </div>
          )}
        </Field>
        <Field label="Gói dịch vụ" hint="Để trống: hệ thống gán gói rẻ nhất đang bán.">
          {(id) => (
            <select id={id} className="pf-select" value={f.plan_id} onChange={set('plan_id')}>
              <option value="">Gói rẻ nhất đang bán</option>
              {sellable.map((p) => <option key={p.id} value={p.id}>{p.name} · {num(p.price_monthly)} ₫/tháng</option>)}
            </select>
          )}
        </Field>
        <div className="row2">
          <Field label="Email liên hệ">{(id) => <input id={id} className="pf-input" type="email" value={f.contact_email} onChange={set('contact_email')} />}</Field>
          <Field label="Số điện thoại">{(id) => <input id={id} className="pf-input" type="tel" value={f.contact_phone} onChange={set('contact_phone')} maxLength={20} />}</Field>
        </div>
        <p className="group-title">Quản trị viên đầu tiên của trung tâm</p>
        <div className="row2">
          <Field label="Họ tên">{(id) => <input id={id} className="pf-input" value={f.admin_name} onChange={set('admin_name')} />}</Field>
          <Field label="Email đăng nhập">{(id) => <input id={id} className="pf-input" type="email" value={f.admin_email} onChange={set('admin_email')} />}</Field>
        </div>
        <Field label="Mật khẩu" hint="Tối thiểu 8 ký tự. Gửi cho chủ trung tâm qua kênh an toàn." error={f.admin_password && !pwOk ? 'Cần ít nhất 8 ký tự' : null}>
          {(id) => <input id={id} className="pf-input" type="password" value={f.admin_password} onChange={set('admin_password')} autoComplete="new-password" />}
        </Field>
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Ban, ChevronRight, ExternalLink, KeyRound, Pause, Pencil, Play } from 'lucide-react';
import { api, type Subscription, type TenantDetail, type TenantUser } from '../lib/api';
import {
  daysLabel, daysUntil, fmtDate, fmtDateTime, num, ROLE_LABEL, SUB_STATUS_LABEL, tenantUrl, toNumber,
} from '../lib/format';
import { useQuery } from '../lib/useQuery';
import { toast } from 'sonner';
import { ChangePlanModal, ExtendModal } from '../modals';
import {
  act, Avatar, Button, ConfirmModal, CopyButton, Empty, ErrorBlock, Field, KebabMenu, Modal, Money, Pill, Skel, StatusPill, Switch, Tabs,
} from '../ui';

type Tab = 'overview' | 'subscriptions' | 'users';

const monthsOf = (s: Subscription): number => Math.max(1, Math.round((new Date(s.period_end).getTime() - new Date(s.period_start).getTime()) / (30 * 86_400_000)));

function Meter({ used, max }: { used: number; max: number | null }) {
  if (max === null) return null;
  const ratio = max > 0 ? used / max : 0;
  return (
    <div className={`pf-meter ${ratio > 1 ? 'over' : ratio >= 0.9 ? 'warn' : ''}`} role="img" aria-label={`${used} trên ${max}`}>
      <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  );
}

function UsageCell({ label, used, max }: { label: string; used: number; max?: number | null }) {
  const limited = max !== undefined;
  const unlimited = limited && max === null;
  return (
    <div className="pf-kpi">
      <div className="label">{label}</div>
      <div className="value">{num(used)}{limited && !unlimited && <span className="unit">/ {num(max)}</span>}</div>
      {limited && !unlimited && <div className="meter"><Meter used={used} max={max!} /></div>}
      <div className="cap">{limited ? (unlimited ? 'Gói không giới hạn' : used > max! ? 'Vượt giới hạn của gói' : `${Math.round((used / max!) * 100)}% giới hạn của gói`) : 'Không giới hạn theo gói'}</div>
    </div>
  );
}

/* ─── Sửa thông tin ─────────────────────────────────────────────────────── */
function EditModal({ open, onClose, onDone, detail }: { open: boolean; onClose: () => void; onDone: () => void; detail: TenantDetail }) {
  const t = detail.tenant;
  const [f, setF] = useState({ name: t.name, email: t.contact_email ?? '', phone: t.contact_phone ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ name: t.name, email: t.contact_email ?? '', phone: t.contact_phone ?? '' }); setError(null); } }, [open, t]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await api.updateTenant(t.id, { name: f.name.trim(), contact_email: f.email.trim() || null, contact_phone: f.phone.trim() || null });
      toast.success('Đã lưu thông tin');
      onDone(); onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Sửa thông tin trung tâm" description="Subdomain không thể đổi sau khi tạo."
      footer={<><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} disabled={f.name.trim().length < 2} type="submit" form="edit-tenant">Lưu</Button></>}>
      <form id="edit-tenant" className="pf-form" onSubmit={submit}>
        <Field label="Tên trung tâm">{(id) => <input id={id} className="pf-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={255} />}</Field>
        <Field label="Email liên hệ">{(id) => <input id={id} className="pf-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Số điện thoại">{(id) => <input id={id} className="pf-input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={20} />}</Field>
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

/* ─── Tab: Tổng quan ────────────────────────────────────────────────────── */
function OverviewTab({ detail, onExtend, onChangePlan }: { detail: TenantDetail; onExtend: () => void; onChangePlan: () => void }) {
  const { tenant: t, usage, currentSubscription: sub } = detail;
  const subLeft = sub ? daysUntil(sub.period_end) : null;
  return (
    <>
      <section className="pf-kpis" aria-label="Mức sử dụng" style={{ marginTop: 24 }}>
        <UsageCell label="Người dùng" used={usage.users} max={usage.limits.max_users} />
        <UsageCell label="Học viên" used={usage.students} max={usage.limits.max_students} />
        <UsageCell label="Giáo viên" used={usage.teachers} />
        <UsageCell label="Khách hàng tiềm năng" used={usage.leads} />
        <UsageCell label="Lớp học" used={usage.classes} />
      </section>

      <div className="pf-two">
        <section className="pf-card" aria-labelledby="sub-h">
          <div className="pf-card-head">
            <h2 id="sub-h">Đăng ký hiện tại</h2>
            <div className="pf-actions"><Button sm variant="tonal" onClick={onExtend} disabled={t.status === 'closed'}>Gia hạn</Button><Button sm variant="tonal" onClick={onChangePlan} disabled={t.status === 'closed'}>Đổi gói</Button></div>
          </div>
          <div className="pf-card-body">
            {sub ? (
              <dl className="pf-dl">
                <dt>Gói</dt><dd>{sub.plan?.name ?? t.plan?.name ?? '—'}</dd>
                <dt>Kỳ</dt><dd>{fmtDate(sub.period_start)} → {fmtDate(sub.period_end)}</dd>
                <dt>Còn lại</dt><dd style={subLeft !== null && subLeft <= 7 ? { color: 'var(--negative)' } : undefined}>{daysLabel(subLeft!)}</dd>
                <dt>Số tiền kỳ này</dt><dd>{toNumber(sub.amount) === 0 ? <span className="muted">0 ₫ (dùng thử)</span> : <Money value={toNumber(sub.amount)} />}</dd>
                <dt>Quy đổi tháng</dt><dd>{toNumber(sub.amount) === 0 ? <span className="muted">—</span> : <><Money value={toNumber(sub.amount) / monthsOf(sub)} /><span className="unit">/ tháng</span></>}</dd>
              </dl>
            ) : (
              <Empty action={t.status !== 'closed' ? <Button sm variant="primary" onClick={onChangePlan}>Chọn gói</Button> : undefined}>
                Chưa có kỳ đăng ký đang chạy.
              </Empty>
            )}
            {t.status === 'trial' && t.trial_ends_at && (
              <p className="pf-info" style={{ marginTop: 16 }}>
                Dùng thử đến <strong>{fmtDate(t.trial_ends_at)}</strong> ({daysLabel(daysUntil(t.trial_ends_at))}). Đổi sang gói trả phí để chuyển thành Đang hoạt động.
              </p>
            )}
          </div>
        </section>

        <section className="pf-card" aria-labelledby="info-h">
          <div className="pf-card-head"><h2 id="info-h">Thông tin</h2></div>
          <div className="pf-card-body">
            <dl className="pf-dl">
              <dt>Địa chỉ</dt><dd><a className="pf-link" href={tenantUrl(t.subdomain)} target="_blank" rel="noreferrer">{t.subdomain}.{window.location.host.replace(/^admin\./, '')}</a></dd>
              <dt>Email liên hệ</dt><dd>{t.contact_email ?? <span className="muted">—</span>}</dd>
              <dt>Điện thoại</dt><dd>{t.contact_phone ?? <span className="muted">—</span>}</dd>
              <dt>Gói hiện tại</dt><dd>{t.plan ? `${t.plan.name} · ${num(t.plan.price_monthly)} ₫/tháng` : <span className="muted">Chưa có gói</span>}</dd>
              <dt>Ngày tạo</dt><dd>{fmtDateTime(t.createdAt)}</dd>
            </dl>
          </div>
        </section>
      </div>
    </>
  );
}

/* ─── Tab: Đăng ký ──────────────────────────────────────────────────────── */
function SubscriptionsTab({ id, version }: { id: number; version: number }) {
  const q = useQuery(() => api.subscriptions(id), [id, version]);
  const tone = (s: Subscription['status']) => (s === 'active' ? 'active' : s === 'past_due' ? 'negative' : 'neutral');
  return (
    <div style={{ marginTop: 24 }}>
      {q.error && !q.data ? <ErrorBlock error={q.error} onRetry={q.reload} what="lịch sử đăng ký" /> : (
        <div className="pf-tablewrap">
          <table className="pf-table">
            <thead><tr><th>Kỳ đăng ký</th><th className="hide-sm">Gói</th><th>Trạng thái</th><th className="num">Số tiền</th></tr></thead>
            <tbody>
              {q.loading && [0, 1, 2].map((i) => <tr key={i}><td><Skel w={180} /></td><td><Skel w={80} /></td><td><Skel w={80} /></td><td><Skel w={90} /></td></tr>)}
              {q.data?.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.period_start)} → {fmtDate(s.period_end)}<span className="show-sm"><span className="sub-line">{s.plan?.name ?? `#${s.plan_id}`}</span></span></td>
                  <td className="hide-sm">{s.plan?.name ?? `#${s.plan_id}`}</td>
                  <td><Pill tone={tone(s.status)}>{SUB_STATUS_LABEL[s.status] ?? s.status}</Pill></td>
                  <td className="num">{toNumber(s.amount) === 0 ? <span className="muted">0 ₫</span> : <Money value={toNumber(s.amount)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.data && q.data.length === 0 && <Empty>Trung tâm chưa có kỳ đăng ký nào.</Empty>}
    </div>
  );
}

/* ─── Tab: Người dùng ───────────────────────────────────────────────────── */
function UsersTab({ id, tenantName }: { id: number; tenantName: string }) {
  const [role, setRole] = useState('');
  const q = useQuery(() => api.tenantUsers(id, role || undefined), [id, role]);
  const [secret, setSecret] = useState<{ user: TenantUser; password: string } | null>(null);
  const [resetting, setResetting] = useState<TenantUser | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggle = async (u: TenantUser, next: boolean) => {
    setBusyId(u.id);
    const ok = await act(() => api.setTenantUserActive(id, u.id, next), next ? `Đã kích hoạt ${u.full_name}` : `Đã vô hiệu hóa ${u.full_name}`);
    setBusyId(null);
    if (ok) q.reload();
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div className="pf-toolbar">
        <select className="pf-select sm" style={{ width: 180 }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Lọc theo vai trò">
          <option value="">Mọi vai trò</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="grow" />
        <span className="total">{q.data ? `${num(q.data.length)} người dùng${q.data.length >= 200 ? ' (hiển thị tối đa 200)' : ''}` : ''}</span>
      </div>
      {q.error && !q.data ? <ErrorBlock error={q.error} onRetry={q.reload} what="người dùng" /> : (
        <div className="pf-tablewrap">
          <table className="pf-table">
            <thead><tr><th>Người dùng</th><th className="hide-sm">Vai trò</th><th className="hide-sm num">Ngày tạo</th><th className="num">Hoạt động</th><th /></tr></thead>
            <tbody>
              {q.loading && [0, 1, 2, 3].map((i) => <tr key={i}><td><Skel w="60%" /></td><td className="hide-sm"><Skel w={70} /></td><td className="hide-sm"><Skel w={80} /></td><td><Skel w={32} /></td><td /></tr>)}
              {q.data?.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'dim'}>
                  <td><div className="ident"><Avatar name={u.full_name} /><div><b>{u.full_name}</b><span className="s">{u.email}</span><div className="show-sm"><span className="s">{ROLE_LABEL[u.role] ?? u.role}</span></div></div></div></td>
                  <td className="hide-sm">{u.role === 'admin' ? <Pill tone="info">{ROLE_LABEL.admin}</Pill> : (ROLE_LABEL[u.role] ?? u.role)}</td>
                  <td className="hide-sm num">{fmtDate(u.createdAt)}</td>
                  <td className="num"><span style={{ display: 'inline-flex' }}><Switch checked={u.is_active} label={`${u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} ${u.full_name}`} disabled={busyId === u.id} onChange={(v) => toggle(u, v)} /></span></td>
                  <td className="actions"><KebabMenu label={`Thao tác với ${u.full_name}`} items={[{ label: 'Đặt lại mật khẩu', icon: <KeyRound />, onSelect: () => setResetting(u) }]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.data && q.data.length === 0 && <Empty>{role ? 'Không có người dùng nào với vai trò này.' : 'Trung tâm chưa có người dùng nào.'}</Empty>}

      <ConfirmModal open={!!resetting} onClose={() => setResetting(null)} title="Đặt lại mật khẩu"
        description={resetting && <>Hệ thống sẽ tạo mật khẩu mới cho <strong>{resetting.full_name}</strong> ({tenantName}). Mật khẩu chỉ hiển thị một lần.</>}
        confirmLabel="Đặt lại mật khẩu"
        onConfirm={async () => {
          const r = await api.resetTenantUserPassword(id, resetting!.id);
          setSecret({ user: resetting!, password: r.password });
        }} />

      <Modal open={!!secret} onClose={() => setSecret(null)} title="Mật khẩu mới"
        description={secret && <>Gửi cho {secret.user.full_name} qua kênh an toàn. Sau khi đóng hộp thoại này sẽ không xem lại được.</>}
        footer={<Button variant="primary" onClick={() => setSecret(null)}>Đã lưu, đóng</Button>}>
        {secret && (
          <div className="pf-secret"><code>{secret.password}</code><CopyButton value={secret.password} /></div>
        )}
      </Modal>
    </div>
  );
}

/* ─── Trang ─────────────────────────────────────────────────────────────── */
export function TenantDetailPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const [params, setParams] = useSearchParams();
  const tab = (['overview', 'subscriptions', 'users'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  const q = useQuery(() => api.tenant(id), [id]);
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState<null | 'extend' | 'plan' | 'edit' | 'suspend' | 'resume' | 'close'>(null);

  const refresh = () => { q.reload(); setVersion((v) => v + 1); };
  const d = q.data;
  const t = d?.tenant;

  useEffect(() => { if (t) document.title = `${t.name} · SmartEdu Super Admin`; }, [t]);

  if (q.error && !d) {
    return (
      <div className="pf-page">
        <div className="pf-crumb"><Link to="/tenants">Trung tâm</Link><ChevronRight /></div>
        <ErrorBlock error={q.error} onRetry={q.reload} what="trung tâm" />
      </div>
    );
  }

  const closed = t?.status === 'closed';
  const currentEnd = t?.status === 'trial' ? t.trial_ends_at : d?.currentSubscription?.period_end ?? null;
  const resumeTo = t?.trial_ends_at ? 'trial' : 'active';

  return (
    <div className="pf-page">
      <nav className="pf-crumb" aria-label="Đường dẫn"><Link to="/tenants">Trung tâm</Link><ChevronRight aria-hidden /></nav>
      <div className="pf-titlerow">
        <div>
          <h1>{t ? <>{t.name}<StatusPill status={t.status} /></> : <Skel w={260} h={28} />}</h1>
          <p className="sub">{t ? <span>{t.subdomain}</span> : <Skel w={140} />}{t?.plan && <> · Gói {t.plan.name}</>}</p>
        </div>
        {t && (
          <div className="pf-actions">
            <a className="pf-btn hide-sm" href={tenantUrl(t.subdomain)} target="_blank" rel="noreferrer"><ExternalLink />Mở trang trung tâm</a>
            <Button disabled={closed} onClick={() => setModal('extend')}>Gia hạn</Button>
            <Button variant="primary" disabled={closed} onClick={() => setModal('plan')}>Đổi gói</Button>
            <KebabMenu label="Thêm thao tác" items={[
              { label: 'Mở trang trung tâm', icon: <ExternalLink />, className: 'only-sm', onSelect: () => window.open(tenantUrl(t.subdomain), '_blank', 'noopener') },
              { label: 'Sửa thông tin', icon: <Pencil />, onSelect: () => setModal('edit') },
              ...(t.status === 'suspended'
                ? [{ label: 'Kích hoạt lại', icon: <Play />, onSelect: () => setModal('resume'), divider: true }]
                : t.status !== 'closed' ? [{ label: 'Tạm ngưng', icon: <Pause />, onSelect: () => setModal('suspend'), divider: true }] : []),
              ...(!closed ? [{ label: 'Đóng vĩnh viễn', icon: <Ban />, danger: true, onSelect: () => setModal('close') }] : []),
            ]} />
          </div>
        )}
      </div>

      {t?.status === 'suspended' && <p className="pf-notice" style={{ marginBottom: 16 }} role="status">Trung tâm đang tạm ngưng: người dùng của trung tâm không truy cập được hệ thống cho đến khi kích hoạt lại.</p>}
      {closed && <p className="pf-info" style={{ marginBottom: 16 }}>Trung tâm đã đóng vĩnh viễn và không thể mở lại hay thay đổi gói.</p>}
      {t?.status === 'trial' && t.trial_ends_at && daysUntil(t.trial_ends_at) < 0 && (
        <p className="pf-error" style={{ marginBottom: 16 }} role="status">Dùng thử đã quá hạn {-daysUntil(t.trial_ends_at)} ngày: người dùng của trung tâm đang bị chặn. Gia hạn hoặc đổi sang gói trả phí để mở lại.</p>
      )}

      <Tabs label="Mục chi tiết" value={tab} onChange={(v) => { const n = new URLSearchParams(params); v === 'overview' ? n.delete('tab') : n.set('tab', v); setParams(n, { replace: true }); }}
        tabs={[{ id: 'overview', label: 'Tổng quan' }, { id: 'subscriptions', label: 'Đăng ký' }, { id: 'users', label: 'Người dùng', count: d?.usage.users }]} />

      {!d ? <div style={{ marginTop: 24 }}><Skel h={96} /></div> : (
        <>
          {tab === 'overview' && <OverviewTab detail={d} onExtend={() => setModal('extend')} onChangePlan={() => setModal('plan')} />}
          {tab === 'subscriptions' && <SubscriptionsTab id={id} version={version} />}
          {tab === 'users' && <UsersTab id={id} tenantName={d.tenant.name} />}
        </>
      )}

      {t && d && (
        <>
          <ExtendModal open={modal === 'extend'} onClose={() => setModal(null)} onDone={refresh} tenant={t} currentEnd={currentEnd} />
          <ChangePlanModal open={modal === 'plan'} onClose={() => setModal(null)} onDone={refresh} tenant={t} usage={d.usage} />
          <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onDone={() => { refresh(); }} detail={d} />
          <ConfirmModal open={modal === 'suspend'} onClose={() => setModal(null)} title={`Tạm ngưng ${t.name}?`} confirmLabel="Tạm ngưng"
            description="Người dùng của trung tâm bị chặn truy cập ngay lập tức. Dữ liệu được giữ nguyên và có thể kích hoạt lại bất cứ lúc nào."
            onConfirm={async () => { await api.setTenantStatus(t.id, 'suspended'); toast.success('Đã tạm ngưng trung tâm'); refresh(); }} />
          <ConfirmModal open={modal === 'resume'} onClose={() => setModal(null)} title={`Kích hoạt lại ${t.name}?`} confirmLabel="Kích hoạt lại"
            description={`Trung tâm quay về trạng thái ${resumeTo === 'trial' ? 'Dùng thử' : 'Đang hoạt động'} và người dùng truy cập lại được ngay.`}
            onConfirm={async () => { await api.setTenantStatus(t.id, resumeTo); toast.success('Đã kích hoạt lại trung tâm'); refresh(); }} />
          <ConfirmModal open={modal === 'close'} onClose={() => setModal(null)} danger title={`Đóng vĩnh viễn ${t.name}?`} confirmLabel="Đóng vĩnh viễn" typeToConfirm={t.subdomain}
            description="Không thể hoàn tác: trung tâm không thể mở lại và mọi người dùng bị chặn truy cập. Dữ liệu vẫn được lưu trong hệ thống."
            onConfirm={async () => { await api.setTenantStatus(t.id, 'closed'); toast.success('Đã đóng trung tâm'); refresh(); }} />
        </>
      )}
      {q.refreshing && <span className="sr" role="status">Đang tải lại</span>}
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Plan, type PlanInput } from '../lib/api';
import { num, toNumber } from '../lib/format';
import { useQuery } from '../lib/useQuery';
import { act, Button, ConfirmModal, Empty, ErrorBlock, Field, KebabMenu, Modal, Money, Skel, Switch } from '../ui';

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function PlanModal({ open, plan, onClose, onDone }: { open: boolean; plan: Plan | null; onClose: () => void; onDone: () => void }) {
  const editing = !!plan;
  const featuresEditable = !plan || plan.features == null || isStringArray(plan.features);
  const blank = { code: '', name: '', price: '0', students: '', users: '', features: '', active: true };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(plan ? {
      code: plan.code, name: plan.name, price: String(Math.round(toNumber(plan.price_monthly))),
      students: plan.max_students?.toString() ?? '', users: plan.max_users?.toString() ?? '',
      features: isStringArray(plan.features) ? plan.features.join('\n') : '', active: plan.is_active,
    } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  const price = Number(f.price);
  const intOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
  const students = intOrNull(f.students);
  const users = intOrNull(f.users);
  const limitOk = (n: number | null) => n === null || (Number.isInteger(n) && n > 0);
  const valid = f.code.trim().length >= 2 && f.name.trim().length >= 2 && Number.isFinite(price) && price >= 0 && limitOk(students) && limitOk(users);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const body: PlanInput = {
      code: f.code.trim(), name: f.name.trim(), price_monthly: price, max_students: students, max_users: users, is_active: f.active,
      ...(featuresEditable ? { features: f.features.split('\n').map((l) => l.trim()).filter(Boolean) } : {}),
    };
    setBusy(true); setError(null);
    try {
      if (plan) await api.updatePlan(plan.id, body); else await api.createPlan(body);
      toast.success(plan ? 'Đã lưu gói dịch vụ' : 'Đã tạo gói dịch vụ');
      onDone(); onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal wide open={open} onClose={onClose} title={editing ? `Sửa gói ${plan!.name}` : 'Tạo gói dịch vụ'}
      description={editing ? 'Thay đổi giá chỉ áp dụng cho các lần đổi gói sau, không đổi kỳ đang chạy.' : 'Gói mới xuất hiện ngay khi đổi gói cho trung tâm.'}
      footer={<><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} disabled={!valid} type="submit" form="plan-edit">{editing ? 'Lưu' : 'Tạo gói'}</Button></>}>
      <form id="plan-edit" className="pf-form" onSubmit={submit}>
        <div className="row2">
          <Field label="Tên gói">{(id) => <input id={id} className="pf-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />}</Field>
          <Field label="Mã gói" hint="Duy nhất, ví dụ pro.">{(id) => <input id={id} className="pf-input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} maxLength={50} />}</Field>
        </div>
        <Field label="Giá mỗi tháng" error={Number.isFinite(price) && price >= 0 ? null : 'Nhập số không âm'}>
          {(id) => <div className="pf-input-group"><input id={id} className="pf-input" type="number" min={0} step={1000} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /><span className="suffix">₫ / tháng</span></div>}
        </Field>
        <div className="row2">
          <Field label="Học viên tối đa" hint="Để trống nếu không giới hạn." error={limitOk(students) ? null : 'Số nguyên dương'}>
            {(id) => <input id={id} className="pf-input" type="number" min={1} value={f.students} onChange={(e) => setF({ ...f, students: e.target.value })} placeholder="Không giới hạn" />}
          </Field>
          <Field label="Người dùng tối đa" hint="Để trống nếu không giới hạn." error={limitOk(users) ? null : 'Số nguyên dương'}>
            {(id) => <input id={id} className="pf-input" type="number" min={1} value={f.users} onChange={(e) => setF({ ...f, users: e.target.value })} placeholder="Không giới hạn" />}
          </Field>
        </div>
        {featuresEditable ? (
          <Field label="Tính năng" hint="Mỗi dòng một tính năng.">
            {(id) => <textarea id={id} className="pf-textarea" value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} />}
          </Field>
        ) : <p className="pf-info">Gói này có cấu hình tính năng dạng nâng cao, giữ nguyên khi lưu.</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div><div style={{ fontWeight: 500 }}>Đang bán</div><div className="muted" style={{ fontSize: 12 }}>Gói ngừng bán không thể gán cho trung tâm mới; trung tâm đang dùng vẫn giữ nguyên.</div></div>
          <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Đang bán" />
        </div>
        {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
      </form>
    </Modal>
  );
}

export function PlansPage() {
  const plans = useQuery(() => api.plans(), []);
  const stats = useQuery(() => api.stats(), []);
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [retiring, setRetiring] = useState<Plan | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const usage = useMemo(() => new Map((stats.data?.planDistribution ?? []).map((r) => [r.plan_id, r.count])), [stats.data]);

  const setActive = async (p: Plan, next: boolean) => {
    setBusyId(p.id);
    const ok = await act(() => api.updatePlan(p.id, { is_active: next }), next ? `Đã mở bán ${p.name}` : `Đã ngừng bán ${p.name}`);
    setBusyId(null);
    if (ok) plans.reload();
  };

  return (
    <div className="pf-page">
      <div className="pf-titlerow">
        <div>
          <h1>Gói dịch vụ</h1>
          <p className="sub">Giá và giới hạn của từng gói. Gói không bao giờ bị xóa, chỉ ngừng bán.</p>
        </div>
        <div className="pf-actions"><Button variant="primary" onClick={() => setEditing('new')}><Plus />Tạo gói</Button></div>
      </div>

      {plans.error && !plans.data ? <ErrorBlock error={plans.error} onRetry={plans.reload} what="gói dịch vụ" /> : (
        <div className="pf-tablewrap">
          <table className="pf-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Gói</th>
                <th className="num">Giá / tháng</th>
                <th className="num hide-sm">Học viên tối đa</th>
                <th className="num hide-sm">Người dùng tối đa</th>
                <th className="num hide-sm">Trung tâm</th>
                <th className="num">Đang bán</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.loading && [0, 1, 2].map((i) => <tr key={i}><td><Skel w="50%" /></td><td><Skel w={90} /></td><td className="hide-sm"><Skel w={60} /></td><td className="hide-sm"><Skel w={60} /></td><td className="hide-sm"><Skel w={30} /></td><td><Skel w={32} /></td><td /></tr>)}
              {plans.data?.map((p) => {
                const n = usage.get(p.id);
                return (
                  <tr key={p.id} className={p.is_active ? '' : 'dim'}>
                    <td>
                      <div className="ident"><div><b>{p.name}</b><span className="s">{p.code}</span>
                        <div className="show-sm"><span className="s">{num(p.max_students ?? 0) === '0' || p.max_students === null ? 'Không giới hạn học viên' : `${num(p.max_students)} học viên`} · {n === undefined ? '—' : `${num(n)} trung tâm`}</span></div>
                      </div></div>
                    </td>
                    <td className="num">{toNumber(p.price_monthly) === 0 ? <span className="muted">Miễn phí</span> : <Money value={toNumber(p.price_monthly)} />}</td>
                    <td className="num hide-sm">{p.max_students === null ? <span className="muted">Không giới hạn</span> : num(p.max_students)}</td>
                    <td className="num hide-sm">{p.max_users === null ? <span className="muted">Không giới hạn</span> : num(p.max_users)}</td>
                    <td className="num hide-sm">{n === undefined ? <span className="muted">—</span> : num(n)}</td>
                    <td className="num"><span style={{ display: 'inline-flex' }}>
                      <Switch checked={p.is_active} label={`${p.is_active ? 'Ngừng bán' : 'Mở bán'} ${p.name}`} disabled={busyId === p.id}
                        onChange={(v) => (!v && (usage.get(p.id) ?? 0) > 0 ? setRetiring(p) : setActive(p, v))} />
                    </span></td>
                    <td className="actions"><KebabMenu label={`Thao tác với ${p.name}`} items={[{ label: 'Sửa gói', icon: <Pencil />, onSelect: () => setEditing(p) }]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {plans.data && plans.data.length === 0 && <Empty action={<Button sm variant="primary" onClick={() => setEditing('new')}>Tạo gói đầu tiên</Button>}>Chưa có gói dịch vụ nào.</Empty>}
      {plans.data && plans.data.some((p) => !p.is_active) && <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>Hàng mờ là gói đã ngừng bán.</p>}

      {plans.data && plans.data.some((p) => p.is_active) && (
        <section aria-labelledby="pricing-h">
          <h2 className="pf-section-h" id="pricing-h">Bảng giá đang bán</h2>
          <div className="pf-pricing">
            {plans.data.filter((p) => p.is_active).map((p) => (
              <article key={p.id} className="pf-plan">
                <h3>{p.name}</h3>
                <div className="price">{toNumber(p.price_monthly) === 0 ? 'Miễn phí' : <Money value={toNumber(p.price_monthly)} />}{toNumber(p.price_monthly) > 0 && <span className="unit">/ tháng</span>}</div>
                <p className="limits">
                  {p.max_students === null ? 'Không giới hạn học viên' : `Tối đa ${num(p.max_students)} học viên`}
                  {' · '}
                  {p.max_users === null ? 'không giới hạn người dùng' : `${num(p.max_users)} người dùng`}
                </p>
                {isStringArray(p.features) && p.features.length > 0
                  ? <ul>{p.features.map((f) => <li key={f}><Check aria-hidden />{f}</li>)}</ul>
                  : <p className="none">Chưa khai báo tính năng.</p>}
                <div className="foot"><Button sm variant="tonal" onClick={() => setEditing(p)}>Sửa gói</Button></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <PlanModal open={editing !== null} plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => { plans.reload(); stats.reload(); }} />
      <ConfirmModal open={!!retiring} onClose={() => setRetiring(null)} title={retiring ? `Ngừng bán ${retiring.name}?` : ''} confirmLabel="Ngừng bán"
        description={retiring && <>Có <strong>{usage.get(retiring.id)}</strong> trung tâm đang dùng gói này. Họ giữ nguyên gói, nhưng không thể gán gói này cho trung tâm khác hay đổi sang nữa.</>}
        onConfirm={async () => { await api.updatePlan(retiring!.id, { is_active: false }); toast.success(`Đã ngừng bán ${retiring!.name}`); plans.reload(); }} />
    </div>
  );
}

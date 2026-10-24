import { forwardRef, useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { AlertCircle, Check, Copy, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { TenantStatus } from './lib/api';
import { STATUS_LABEL, initials, tint } from './lib/format';

/* ─── Button ─────────────────────────────────────────────────────────────── */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
  solid?: boolean;
  sm?: boolean;
  icon?: boolean;
  loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'secondary', solid, sm, icon, loading, className = '', children, disabled, type = 'button', ...rest }, ref,
) {
  const cls = ['pf-btn', variant === 'secondary' ? '' : variant, solid ? 'solid' : '', sm ? 'sm' : '', icon ? 'icon' : '', className].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="pf-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ─── Pill, avatar ───────────────────────────────────────────────────────── */
export function StatusPill({ status }: { status: TenantStatus }) {
  return <span className={`pf-pill ${status}`}>{STATUS_LABEL[status]}</span>;
}
export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'positive' | 'negative' | 'warning' | 'active' | 'trial' | 'info'; children: ReactNode }) {
  return <span className={`pf-pill ${tone}`}>{children}</span>;
}
export function Avatar({ name, seed, lg, square }: { name: string; seed?: string; lg?: boolean; square?: boolean }) {
  return (
    <span className={`pf-avatar ${lg ? 'lg' : ''} ${square ? 'sq' : ''}`} style={tint(seed ?? name)} aria-hidden>
      {initials(name)}
    </span>
  );
}

/* ─── Money / number with muted unit ─────────────────────────────────────── */
export function Money({ value }: { value: number }) {
  return <span className="num">{new Intl.NumberFormat('vi-VN').format(Math.round(value))}<span className="unit">₫</span></span>;
}

/* ─── Field ──────────────────────────────────────────────────────────────── */
export function Field({ label, hint, error, ok, children }: { label: string; hint?: ReactNode; error?: string | null; ok?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="pf-field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? <span className="err" role="alert">{error}</span> : ok ? <span className="ok">{ok}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="pf-switch" disabled={disabled} onClick={() => onChange(!checked)} />
  );
}

/* ─── States ─────────────────────────────────────────────────────────────── */
export function ErrorBlock({ error, onRetry, what = 'dữ liệu' }: { error: Error; onRetry?: () => void; what?: string }) {
  return (
    <div className="pf-error" role="alert">
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={16} />
        Không tải được {what}. {error.message}
      </span>
      {onRetry && <Button sm onClick={onRetry}>Thử lại</Button>}
    </div>
  );
}
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="pf-empty"><span>{children}</span>{action}</div>;
}
export function Skel({ w = '100%', h = 14 }: { w?: number | string; h?: number }) {
  return <span className="pf-skel" style={{ width: w, height: h }} aria-hidden />;
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, description, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
          <Dialog.Overlay className="pf-portal pf-overlay" />
          <Dialog.Content className={`pf-portal pf-modal ${wide ? 'wide' : ''}`}>
            <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
            {description ? <Dialog.Description asChild><p className="desc">{description}</p></Dialog.Description> : <Dialog.Description className="sr">{title}</Dialog.Description>}
            {children}
            {footer && <div className="foot">{footer}</div>}
          </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Hộp xác nhận. Với thao tác không hoàn tác được, bắt gõ lại tên đối tượng. */
export function ConfirmModal({ open, onClose, title, description, confirmLabel, danger, typeToConfirm, onConfirm }: {
  open: boolean; onClose: () => void; title: string; description: ReactNode; confirmLabel: string; danger?: boolean;
  typeToConfirm?: string; onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setTyped(''); setError(null); } }, [open]);
  const blocked = typeToConfirm !== undefined && typed.trim() !== typeToConfirm;
  const run = async () => {
    setBusy(true); setError(null);
    try { await onConfirm(); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Hủy</Button>
        <Button variant={danger ? 'danger' : 'primary'} solid={danger} loading={busy} disabled={blocked} onClick={run}>{confirmLabel}</Button>
      </>}>
      {typeToConfirm !== undefined && (
        <Field label={`Gõ “${typeToConfirm}” để xác nhận`}>
          {(id) => <input id={id} className="pf-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}
        </Field>
      )}
      {error && <p className="pf-field"><span className="err" role="alert">{error}</span></p>}
    </Modal>
  );
}

/* ─── Kebab menu ─────────────────────────────────────────────────────────── */
export interface MenuItem { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean; divider?: boolean; className?: string }
export function KebabMenu({ items, label = 'Thao tác', trigger }: { items: MenuItem[]; label?: string; trigger?: ReactNode }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        {trigger ?? <Button sm icon variant="ghost" aria-label={label}><MoreHorizontal /></Button>}
      </Dropdown.Trigger>
      <Dropdown.Portal>
          <Dropdown.Content className="pf-portal pf-menu" align="end" sideOffset={6}>
            {items.map((it, i) => (
              <div key={i}>
                {it.divider && <hr />}
                <Dropdown.Item className={[it.danger ? 'danger' : '', it.className ?? ''].join(' ').trim() || undefined} disabled={it.disabled} onSelect={it.onSelect}>
                  {it.icon}{it.label}
                </Dropdown.Item>
              </div>
            ))}
          </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

/* ─── Copy ───────────────────────────────────────────────────────────────── */
export function CopyButton({ value, label = 'Sao chép' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button sm onClick={async () => {
      try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); }
      catch { toast.error('Không sao chép được, hãy chọn và copy thủ công.'); }
    }}>
      {done ? <Check /> : <Copy />}{done ? 'Đã chép' : label}
    </Button>
  );
}

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
export function Tabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="pf-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className="pf-tab" onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Chạy một thao tác ghi, báo thành công/thất bại bằng toast. Trả về true nếu thành công. */
export async function act(fn: () => Promise<unknown>, success: string): Promise<boolean> {
  try { await fn(); toast.success(success); return true; }
  catch (e) { toast.error((e as Error).message); return false; }
}

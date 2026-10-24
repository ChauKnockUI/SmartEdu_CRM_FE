import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { api, type Stats, type TenantStatus } from '../lib/api';
import { daysLabel, daysUntil, fmtDate, fmtDayMonth, num, STATUS_COLOR, STATUS_LABEL } from '../lib/format';
import { useQuery } from '../lib/useQuery';
import { CreateTenantModal, ExtendModal } from '../modals';
import { Avatar, Button, Empty, ErrorBlock, Money, Skel, StatusPill } from '../ui';

const DAY = 86_400_000;
const STATUSES: TenantStatus[] = ['active', 'trial', 'suspended', 'closed'];

interface RunwayItem {
  key: string;
  id: number;
  name: string;
  subdomain: string;
  end: string;
  kind: 'paid' | 'trial';
  status: TenantStatus;
}

function buildRunway(s: Stats): RunwayItem[] {
  const paid = s.expiringSoon.subscriptions.map<RunwayItem>((x) => ({
    key: `s${x.tenant.id}`, id: x.tenant.id, name: x.tenant.name, subdomain: x.tenant.subdomain, end: x.period_end, kind: 'paid', status: 'active',
  }));
  const trial = s.expiringSoon.trials.map<RunwayItem>((x) => ({
    key: `t${x.id}`, id: x.id, name: x.name, subdomain: x.subdomain, end: x.trial_ends_at, kind: 'trial', status: 'trial',
  }));
  return [...paid, ...trial].sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());
}

function Runway({ items, windowDays, onExtend }: { items: RunwayItem[]; windowDays: number; onExtend: (i: RunwayItem) => void }) {
  const now = Date.now();
  const days = Array.from({ length: windowDays }, (_, i) => new Date(now + i * DAY));
  return (
    <div className="pf-runway">
      <div className="pf-runway-axis" aria-hidden>
        <span />
        <div className="ticks">
          {days.map((d, i) => (i % 2 === 0
            ? <span key={i} style={{ gridColumn: `${i + 1} / span ${i === days.length - 1 ? 1 : 2}` }}>{i === 0 ? 'Hôm nay' : fmtDayMonth(d)}</span>
            : null))}
        </div>
        <span />
      </div>
      <ul>
        {items.map((it) => {
          const left = daysUntil(it.end, now);
          const frac = Math.min(1, Math.max(0, (new Date(it.end).getTime() - now) / (windowDays * DAY)));
          return (
            <li key={it.key} className="pf-runway-row">
              <div className="who">
                <Link to={`/tenants/${it.id}`}>{it.name}</Link>
                <span>{it.subdomain}{it.kind === 'trial' ? ' · dùng thử' : ''}</span>
              </div>
              <div className="pf-runway-track" role="img" aria-label={`${it.name} ${daysLabel(left)}`}>
                <span className={`pf-bar ${it.kind}`} style={{ width: `${frac * 100}%` }} />
              </div>
              <div className="when">
                <div className="left"><b className={left <= 2 ? 'urgent' : undefined}>{daysLabel(left)}</b><span>{fmtDate(it.end)}</span></div>
                <Button sm variant="tonal" onClick={() => onExtend(it)}>Gia hạn</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OverviewPage() {
  const nav = useNavigate();
  const stats = useQuery(() => api.stats(), []);
  const recent = useQuery(() => api.tenants({ limit: 5 }), []);
  const [creating, setCreating] = useState(false);
  const [extending, setExtending] = useState<RunwayItem | null>(null);

  const s = stats.data;
  const runway = useMemo(() => (s ? buildRunway(s) : []), [s]);
  const reload = () => { stats.reload(); recent.reload(); };

  const by = (st: TenantStatus) => s?.tenants.byStatus[st] ?? 0;
  const monthStart = `01/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const stamp = stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;

  const finding = !s ? null : (
    <>
      {runway.length > 0
        ? <><strong>{runway.length >= 10 ? '10+' : runway.length} trung tâm</strong> hết hạn trong {s.expiringSoon.windowDays} ngày tới</>
        : <>Không có trung tâm nào hết hạn trong {s.expiringSoon.windowDays} ngày tới</>}
      {s.tenants.trialExpired > 0
        ? <>; <strong>{s.tenants.trialExpired}</strong> trung tâm dùng thử đã quá hạn mà chưa chuyển sang gói trả phí.</>
        : '.'}
    </>
  );

  return (
    <div className="pf-page">
      <div className="pf-titlerow">
        <div>
          <h1>Tổng quan</h1>
          <p className="sub">{finding ?? <Skel w={360} />}</p>
        </div>
        <div className="pf-actions">
          {stamp && <span className="pf-stamp">Cập nhật {stamp}</span>}
          <Button icon aria-label="Tải lại số liệu" onClick={reload} disabled={stats.refreshing}><RefreshCw className={stats.refreshing ? 'pf-spin-icon' : ''} /></Button>
          <Button variant="primary" onClick={() => setCreating(true)}><Plus />Tạo trung tâm</Button>
        </div>
      </div>

      {stats.error && !s && <div style={{ marginBottom: 24 }}><ErrorBlock error={stats.error} onRetry={stats.reload} what="số liệu tổng quan" /></div>}

      <section className="pf-kpis hero" aria-label="Chỉ số chính">
        <div className="pf-kpi">
          <div className="label">Doanh thu định kỳ (MRR)</div>
          <div className="value lead">{s ? <Money value={s.revenue.mrr} /> : <Skel w={150} h={32} />}</div>
          <div className="cap">Quy đổi theo tháng từ các kỳ trả phí đang chạy</div>
        </div>
        <div className="pf-kpi">
          <div className="label">Doanh thu tháng này</div>
          <div className="value">{s ? <Money value={s.revenue.thisMonth} /> : <Skel w={120} h={28} />}</div>
          <div className="cap">Các kỳ trả phí bắt đầu từ {monthStart}</div>
        </div>
        <div className="pf-kpi">
          <div className="label">Đang hoạt động</div>
          <div className="value">{s ? <>{num(by('active'))}<span className="unit">/ {num(s.tenants.total)} trung tâm</span></> : <Skel w={90} h={28} />}</div>
          <div className="cap">{s ? `${num(s.tenants.newThisWeek)} trung tâm mới trong 7 ngày qua` : <Skel w={140} h={12} />}</div>
        </div>
        <div className="pf-kpi">
          <div className="label">Đang dùng thử</div>
          <div className="value">{s ? num(by('trial')) : <Skel w={50} h={28} />}</div>
          {s && (s.tenants.trialExpired > 0
            ? <div className="cap bad">{s.tenants.trialExpired} đã quá hạn · <Link to="/tenants?status=trial">xem danh sách</Link></div>
            : <div className="cap">Không có trung tâm quá hạn dùng thử</div>)}
        </div>
        <div className="pf-kpi">
          <div className="label">Người dùng</div>
          <div className="value">{s ? num(s.totalUsers) : <Skel w={70} h={28} />}</div>
          <div className="cap">Trên tất cả trung tâm</div>
        </div>
      </section>

      <div className="pf-grid">
        <div className="pf-stack">
          <section className="pf-card" aria-labelledby="runway-h">
            <div className="pf-card-head">
              <h2 id="runway-h">Sắp hết hạn trong {s?.expiringSoon.windowDays ?? 7} ngày</h2>
              <div className="pf-legend"><span><i className="paid" />Gói trả phí</span><span><i className="trial" />Dùng thử</span></div>
            </div>
            {!s ? (
              <div className="pf-runway">
                {[0, 1, 2].map((i) => <div key={i} className="pf-runway-row"><Skel w={140} /><Skel h={12} /><Skel w={110} /></div>)}
              </div>
            ) : runway.length === 0 ? (
              <div className="pf-card-body"><Empty>Không có kỳ đăng ký hoặc hạn dùng thử nào kết thúc trong {s.expiringSoon.windowDays} ngày tới.</Empty></div>
            ) : (
              <Runway items={runway} windowDays={s.expiringSoon.windowDays} onExtend={setExtending} />
            )}
          </section>

          <section className="pf-card" aria-labelledby="plans-h">
            <div className="pf-card-head">
              <h2 id="plans-h">Trung tâm theo gói</h2>
              <Link to="/plans" className="pf-link">Quản lý gói<ChevronRight aria-hidden /></Link>
            </div>
            <div className="pf-card-body">
              {!s ? <Skel h={60} /> : s.planDistribution.length === 0 ? <Empty>Chưa có trung tâm nào.</Empty> : (() => {
                const rows = [...s.planDistribution].sort((a, b) => b.count - a.count);
                const max = Math.max(...rows.map((r) => r.count), 1);
                return (
                  <ul className="pf-barlist">
                    {rows.map((r) => (
                      <li key={r.plan_id ?? 'none'}>
                        <span>{r.name ?? 'Chưa có gói'}</span>
                        <span className="num">{num(r.count)}</span>
                        <div className="track"><span style={{ width: `${(r.count / max) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </section>
        </div>

        <div className="pf-stack" style={{ gap: 24 }}>
          <section aria-labelledby="recent-h">
            <h2 className="pf-rail-h" id="recent-h">Mới đăng ký <Link to="/tenants" className="pf-link">Xem tất cả<ChevronRight aria-hidden /></Link></h2>
            <div className="pf-card"><div className="pf-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {recent.error && !recent.data ? <ErrorBlock error={recent.error} onRetry={recent.reload} what="danh sách trung tâm" /> : (
                <ul className="pf-list">
                  {!recent.data && [0, 1, 2].map((i) => <li key={i}><Skel w={28} h={28} /><div className="main"><Skel w="60%" /></div></li>)}
                  {recent.data?.items.map((t) => (
                    <li key={t.id}>
                      <Avatar name={t.name} square />
                      <div className="main"><Link to={`/tenants/${t.id}`}>{t.name}</Link><span>{t.subdomain} · {fmtDate(t.createdAt)}</span></div>
                      <StatusPill status={t.status} />
                    </li>
                  ))}
                  {recent.data && recent.data.items.length === 0 && <li><Empty>Chưa có trung tâm nào.</Empty></li>}
                </ul>
              )}
            </div></div>
          </section>

          <section aria-labelledby="status-h">
            <h2 className="pf-rail-h" id="status-h">Tình trạng trung tâm</h2>
            <div className="pf-card"><div className="pf-card-body">
              {!s ? <Skel h={80} /> : s.tenants.total === 0 ? <Empty>Chưa có trung tâm nào.</Empty> : (
                <>
                  <div className="pf-stackbar" role="img" aria-label={STATUSES.map((st) => `${STATUS_LABEL[st]} ${by(st)}`).join(', ')}>
                    {STATUSES.filter((st) => by(st) > 0).map((st) => <span key={st} style={{ flex: by(st), background: STATUS_COLOR[st] }} />)}
                  </div>
                  <ul className="pf-legend-table">
                    {STATUSES.map((st) => (
                      <li key={st}>
                        <i className="pf-dot" style={{ background: STATUS_COLOR[st] }} />
                        <Link to={`/tenants?status=${st}`}>{STATUS_LABEL[st]}</Link>
                        <span className="num">{num(by(st))}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div></div>
          </section>
        </div>
      </div>

      <CreateTenantModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => nav(`/tenants/${id}`)} />
      {extending && (
        <ExtendModal open onClose={() => setExtending(null)} onDone={reload}
          tenant={{ id: extending.id, name: extending.name, status: extending.status }} currentEnd={extending.end} />
      )}
    </div>
  );
}

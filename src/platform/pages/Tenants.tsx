import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { api, type TenantStatus } from '../lib/api';
import { daysLabel, daysUntil, fmtDate, num, STATUS_LABEL } from '../lib/format';
import { useDebounced, useQuery } from '../lib/useQuery';
import { CreateTenantModal } from '../modals';
import { Avatar, Button, Empty, ErrorBlock, Skel, StatusPill, Tabs } from '../ui';

const PAGE_SIZE = 20;
type Filter = 'all' | TenantStatus;
const FILTERS: Filter[] = ['all', 'trial', 'active', 'suspended', 'closed'];

export function TenantsPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (FILTERS.includes(params.get('status') as Filter) ? params.get('status') : 'all') as Filter;
  const urlSearch = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [search, setSearch] = useState(urlSearch);
  useEffect(() => setSearch(urlSearch), [urlSearch]);
  const debounced = useDebounced(search.trim(), 350);
  const [creating, setCreating] = useState(false);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  // Gõ tìm kiếm -> đồng bộ lên URL (đặt lại về trang 1)
  useEffect(() => {
    if (debounced !== urlSearch) update({ search: debounced || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const stats = useQuery(() => api.stats(), []);
  const list = useQuery(
    () => api.tenants({ page, limit: PAGE_SIZE, search: urlSearch || undefined, status: status === 'all' ? undefined : status }),
    [page, urlSearch, status],
  );

  const counts = stats.data?.tenants.byStatus;
  const tabs = FILTERS.map((f) => ({
    id: f,
    label: f === 'all' ? 'Tất cả' : STATUS_LABEL[f],
    count: stats.data ? (f === 'all' ? stats.data.tenants.total : counts?.[f] ?? 0) : undefined,
  }));

  const total = list.data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="pf-page">
      <div className="pf-titlerow">
        <div>
          <h1>Trung tâm</h1>
          <p className="sub">Mọi trung tâm đang thuê SmartEdu, theo trạng thái và gói dịch vụ.</p>
        </div>
        <div className="pf-actions">
          <Button variant="primary" onClick={() => setCreating(true)}><Plus />Tạo trung tâm</Button>
        </div>
      </div>

      <Tabs label="Lọc theo trạng thái" tabs={tabs} value={status} onChange={(v) => update({ status: v === 'all' ? null : v, page: null })} />

      <div className="pf-toolbar">
        <div className="pf-search inline">
          <Search aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên hoặc subdomain" aria-label="Tìm trung tâm" style={{ paddingRight: 12 }} />
        </div>
        <span className="grow" />
        <span className="total" aria-live="polite">{list.data ? `${num(total)} trung tâm` : ''}</span>
      </div>

      {list.error && !list.data ? <ErrorBlock error={list.error} onRetry={list.reload} what="danh sách trung tâm" /> : (
        <>
          <div className="pf-tablewrap" style={{ opacity: list.refreshing ? 0.6 : 1 }}>
            <table className="pf-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Trung tâm</th>
                  <th className="hide-sm">Gói</th>
                  <th className="hide-sm">Trạng thái</th>
                  <th className="hide-sm hide-md">Hạn dùng thử</th>
                  <th className="hide-sm hide-md">Liên hệ</th>
                  <th className="hide-sm num">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {list.loading && Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}><td><Skel w="60%" /></td><td className="hide-sm"><Skel w={80} /></td><td className="hide-sm"><Skel w={90} /></td><td className="hide-sm hide-md"><Skel w={100} /></td><td className="hide-sm hide-md"><Skel w={140} /></td><td className="hide-sm"><Skel w={80} /></td></tr>
                ))}
                {list.data?.items.map((t) => {
                  const left = t.status === 'trial' && t.trial_ends_at ? daysUntil(t.trial_ends_at) : null;
                  return (
                    <tr key={t.id} className={t.status === 'closed' ? 'dim' : ''} onDoubleClick={() => nav(`/tenants/${t.id}`)}>
                      <td>
                        <div className="ident">
                          <Avatar name={t.name} square />
                          <div>
                            <Link to={`/tenants/${t.id}`}>{t.name}</Link>
                            <span className="s">{t.subdomain}</span>
                            <div className="show-sm"><StatusPill status={t.status} /><span className="s">{t.plan?.name ?? 'Chưa có gói'}</span></div>
                          </div>
                        </div>
                      </td>
                      <td className="hide-sm">{t.plan?.name ?? <span className="muted">—</span>}</td>
                      <td className="hide-sm"><StatusPill status={t.status} /></td>
                      <td className="hide-sm hide-md">
                        {left === null ? <span className="muted">—</span> : (
                          <span style={left < 0 ? { color: 'var(--negative)' } : undefined}>{daysLabel(left)}<span className="muted" style={{ display: 'block', fontSize: 12 }}>{fmtDate(t.trial_ends_at)}</span></span>
                        )}
                      </td>
                      <td className="hide-sm hide-md" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.contact_email ?? <span className="muted">—</span>}
                        {t.contact_phone && <span className="muted" style={{ display: 'block', fontSize: 12 }}>{t.contact_phone}</span>}
                      </td>
                      <td className="hide-sm num">{fmtDate(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {list.data && list.data.items.length === 0 && (
            <Empty action={(urlSearch || status !== 'all') ? <Button sm onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Xóa bộ lọc</Button> : <Button sm variant="primary" onClick={() => setCreating(true)}>Tạo trung tâm đầu tiên</Button>}>
              {urlSearch || status !== 'all' ? 'Không có trung tâm nào khớp bộ lọc.' : 'Chưa có trung tâm nào.'}
            </Empty>
          )}

          {list.data && total > 0 && (
            <div className="pf-pager">
              <span>{from}–{to} trên {num(total)}</span>
              <div>
                <Button sm icon aria-label="Trang trước" disabled={page <= 1} onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}><ChevronLeft /></Button>
                <Button sm icon aria-label="Trang sau" disabled={to >= total} onClick={() => update({ page: String(page + 1) })}><ChevronRight /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateTenantModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => nav(`/tenants/${id}`)} />
    </div>
  );
}

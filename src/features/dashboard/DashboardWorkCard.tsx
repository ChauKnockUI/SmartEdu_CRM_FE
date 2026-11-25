import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Drawer, List, Space, Spin, Table, Typography } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { dashboardService, type DashboardAlert, type DashboardWork } from '../../services/api/dashboard.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { createWorkListCache } from './workListCache';

export function WorkItemsTable({ data, onOpen }: { data: DashboardWork; onOpen: (action: string) => void }) {
  return <Table<DashboardWork['items'][number]> size="small" rowKey="id" dataSource={data.items} scroll={{ x: 650 }}
    pagination={paginationProps('trường hợp', { pageSize: 3, showSizeChanger: false, hideOnSinglePage: true })}
    locale={{ emptyText: 'Không còn việc trong nhóm này' }} columns={[
      { title: 'Nội dung', render: (_, item) => <><strong>{item.title}</strong><div className="text-xs text-gray-500">{item.reason}</div></> },
      { title: 'Thời điểm', width: 180, render: (_, item) => <>
        {item.since ? <><div className="text-xs text-gray-500">{item.since_label}</div>{new Date(item.since).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', ...(item.since_label === 'Hạn thu' ? {} : { timeStyle: 'short' as const }),
        })}</> : '—'}
        {item.waiting_days !== undefined && <div className="text-xs text-gray-500">{data.category === 'attendance' ? 'Quá hạn' : 'Chờ'} {item.waiting_days ? `${item.waiting_days} ngày` : 'dưới 1 ngày'}</div>}
      </> },
      ...(data.items.some(item => item.amount !== undefined) ? [{ title: 'Còn phải thu', width: 140,
        render: (_: unknown, item: DashboardWork['items'][number]) => `${Number(item.amount || 0).toLocaleString('vi-VN')} đ` }] : []),
      { title: 'Thao tác', width: 145, render: (_, item) => <Button type="link" size="small" onClick={() => onOpen(item.action)}>{item.action_label}</Button> },
    ]} />;
}

export function DashboardWorkCard({ revision, alerts = [], overviewError = false, extraGroup, onReload }: {
  revision: number; alerts?: DashboardAlert[]; overviewError?: boolean;
  extraGroup?: { title: string; count: number; content: ReactNode };
  onReload?: () => void;
}) {
  const { user, token } = useAuth();
  const { openDetail } = useDetailNavigation();
  const [refresh, setRefresh] = useState(0), [category, setCategory] = useState<string>();
  const [extraOpen, setExtraOpen] = useState(false);
  const epoch = JSON.stringify([user?.id, user?.role, token, revision, refresh]);
  const [summary, setSummary] = useState<DashboardWork | null>(null), [summaryOwner, setSummaryOwner] = useState('');
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DashboardWork | null>(null), [detailOwner, setDetailOwner] = useState('');
  const [detailError, setDetailError] = useState(''), [detailLoading, setDetailLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const cache = useRef<ReturnType<typeof createWorkListCache> | null>(null);
  useEffect(() => {
    if (!user || !token) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setSummary(null); setSummaryOwner(epoch); setCounts({});
    cache.current = createWorkListCache(async selected => {
      const result = await dashboardService.getWork({ category: selected, view: 'list' }, controller.signal, token);
      if (result.role !== user.role || result.category !== selected) throw new Error('Phạm vi cảnh báo đã thay đổi. Vui lòng tải lại.');
      return result;
    });
    dashboardService.getWork({ view: 'summary' }, controller.signal, token).then(result => {
      if (controller.signal.aborted) return;
      if (result.role !== user.role) throw new Error('Phạm vi cảnh báo đã thay đổi. Vui lòng tải lại.');
      setSummary(result);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message || 'Không tải được cảnh báo.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); cache.current = null; };
  }, [epoch]);
  const visible = summaryOwner === epoch ? summary : null;
  const detailKey = JSON.stringify([epoch, category]);
  useEffect(() => {
    if (!category || !visible || !cache.current) return;
    let current = true;
    setDetailLoading(true); setDetail(null); setDetailError(''); setDetailOwner(detailKey);
    cache.current(category).then(result => {
      if (!current) return;
      setDetail(result); setCounts(previous => ({ ...previous, [category]: result.pagination.total }));
    }).catch(err => { if (current) setDetailError(err.message || 'Không tải được chi tiết cảnh báo.'); })
      .finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; };
  }, [detailKey, visible]);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  if (!user) return null;
  const groups = (visible?.groups || []).map(group => ({ ...group, total: counts[group.key] ?? group.total })).filter(group => group.total > 0);
  const rows = [...groups.map(group => ({ id: group.key, title: group.label, count: group.total, category: group.key, action: '' })),
    ...alerts.filter(alert => alert.count === undefined || alert.count > 0).map(alert => ({ ...alert, count: undefined, category: '', action: alert.action || '' })),
    ...(extraGroup && extraGroup.count > 0 ? [{ id: 'extra', title: extraGroup.title, count: extraGroup.count, category: 'extra', action: '' }] : [])];
  const selected = visible?.groups.find(group => group.key === category);
  const currentDetail = detailOwner === detailKey ? detail : null;
  const reload = () => onReload ? onReload() : setRefresh(value => value + 1);
  return <>
    <Card className="crm-dashboard-warnings" title="Cảnh báo" styles={{ body: { padding: '8px 16px' } }}
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading || summaryOwner !== epoch} onClick={reload}>Tải lại</Button>}>
      {overviewError && <Alert className="my-2" type="warning" showIcon message="Chưa tải được cảnh báo tổng quan. Các nhóm công việc vẫn tải riêng." />}
      {error && summaryOwner === epoch && <Alert className="my-2" type="error" showIcon message={error}
        action={<Button size="small" onClick={reload}>Thử lại</Button>} />}
      {loading || summaryOwner !== epoch ? <Spin className="my-3" /> : <List className="crm-warning-list" key={epoch} size="small" rowKey="id" dataSource={rows}
        pagination={rows.length > 5 ? paginationProps('cảnh báo', { pageSize: 5, showSizeChanger: false }) : false}
        locale={{ emptyText: error ? 'Chưa xác định được các nhóm công việc.' : 'Không có cảnh báo cần xử lý' }}
        renderItem={item => <List.Item actions={[<Space key="view" size={8}>
          {item.count !== undefined && <span className="crm-warning-count">{item.count}</span>}
          <Button type="link" size="small" aria-label={`Xem ${item.title}`} onClick={() => {
            if (item.category === 'extra') setExtraOpen(true);
            else if (item.category) setCategory(item.category); else if (item.action) openDetail(item.action);
          }}>Xem</Button></Space>]}>
          <div className="crm-warning-label"><WarningOutlined /><span>{item.title}</span></div>
        </List.Item>} />}
    </Card>
    <Drawer title={extraGroup?.title} open={extraOpen && !!extraGroup} onClose={() => setExtraOpen(false)} width={680}
      extra={<Button size="small" icon={<ReloadOutlined />} onClick={reload}>Tải lại</Button>}>
      {extraGroup?.content}
    </Drawer>
    <Drawer title={selected?.label || 'Chi tiết cảnh báo'} open={!!category} onClose={() => setCategory(undefined)} width={880}
      extra={<Button size="small" icon={<ReloadOutlined />} onClick={reload}>Tải lại</Button>}>
      <p className="mb-3 text-sm text-gray-500">{selected?.description}</p>
      {detailOwner === detailKey && detailError ? <Alert type="error" showIcon message={detailError}
        action={<Button onClick={reload}>Thử lại</Button>} />
        : detailLoading || !currentDetail ? <Spin /> : <WorkItemsTable key={category} data={currentDetail} onOpen={openDetail} />}
      {currentDetail && <Typography.Text type="secondary" className="mt-3 block text-xs">Chuyển trang dùng danh sách đã tải. Bấm Tải lại để cập nhật thay đổi.</Typography.Text>}
    </Drawer>
  </>;
}

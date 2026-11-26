import type { ReactNode } from 'react';
import { Card, Col, Statistic } from 'antd';
import { Link } from 'react-router';
import { InfoHint } from './InfoHint';

export function SummaryCard({ title, value, prefix, suffix, currency, to, note, caption }: {
  title: string; value: number | null; prefix: ReactNode; suffix?: ReactNode;
  currency?: boolean; to?: string; note?: ReactNode; caption?: string;
}) {
  const statistic = <Statistic value={value ?? 0} prefix={caption ? undefined : prefix}
    suffix={currency || value === null ? undefined : suffix}
    formatter={value === null ? () => 'Chưa có dữ liệu' : currency ? current => `${Number(current).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ` : undefined}
    valueStyle={{ color: '#262626', fontSize: value === null ? 16 : currency ? 22 : caption ? 30 : 24, lineHeight: 1.2 }} />;
  return <Col xs={24} sm={12} lg={6}><Card className="crm-kpi" styles={{ body: { padding: 16 } }}>
    <div className="crm-kpi-label"><span className="crm-kpi-heading">{caption && prefix}{title}</span>
      {note && <InfoHint label={`Thông tin ${title}`}>{note}</InfoHint>}
    </div>
    {to ? <Link to={to} className="block" aria-label={`Xem ${title}`}>{statistic}</Link> : statistic}
    {caption && <div className="crm-kpi-caption">{caption}</div>}
  </Card></Col>;
}

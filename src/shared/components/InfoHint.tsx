import type { ReactNode } from 'react';
import { Button, Popover } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export function InfoHint({ label, children }: { label: string; children: ReactNode }) {
  return <Popover title={label} content={<div className="crm-info-content">{children}</div>}
    trigger={['hover', 'click']}>
    <Button className="crm-info-hint" type="text" size="small" aria-label={label} icon={<InfoCircleOutlined />} />
  </Popover>;
}

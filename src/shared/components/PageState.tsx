import { Alert, Button, Card, Space, Spin } from 'antd';

export function PageState({ loading = false, title, description, onRetry, onBack, backLabel = 'Quay lại' }: {
  loading?: boolean; title: string; description?: string; onRetry?: () => void; onBack?: () => void; backLabel?: string;
}) {
  return <div className="crm-page">
    {loading ? <Card><div className="crm-page-state" role="status" aria-live="polite"><Spin /><span>{title}</span></div></Card>
      : <Alert type="error" showIcon message={title} description={description}
        action={<Space wrap>{onRetry && <Button onClick={onRetry}>Thử lại</Button>}{onBack && <Button onClick={onBack}>{backLabel}</Button>}</Space>} />}
  </div>;
}

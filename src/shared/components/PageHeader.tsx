import type React from 'react';
import { Breadcrumb, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router';
import type { BreadcrumbProps } from 'antd';
import { useDetailNavigation } from '../hooks/useDetailNavigation';
import { isDetailPath } from '../utils/navigation';

interface PageHeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbProps['items'];
  description?: string;
  actions?: React.ReactNode;
  back?: boolean;
}

export function PageHeader({ title, breadcrumbs, description, actions, back }: PageHeaderProps) {
  const location = useLocation();
  const { goBack } = useDetailNavigation();
  const showBack = back ?? isDetailPath(location.pathname);
  return (
    <header className="crm-page-header">
      <div className="crm-page-header-copy">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} className="mb-2" itemRender={item => item.href
            ? <Link to={item.href}>{item.title}</Link> : item.title} />
        )}
        <div className="crm-page-heading">
          {showBack && <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Quay lại trang trước" title="Quay lại trang trước">{!title ? 'Quay lại' : null}</Button>}
          {title && <h1>{title}</h1>}
        </div>
        {description && <p className="crm-page-description">{description}</p>}
      </div>
      {actions && <div className="crm-page-header-actions">{actions}</div>}
    </header>
  );
}

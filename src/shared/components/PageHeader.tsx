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

export function PageHeader({ title, breadcrumbs, actions, back }: PageHeaderProps) {
  const location = useLocation();
  const { goBack } = useDetailNavigation();
  const showBack = back ?? isDetailPath(location.pathname);
  return (
    <div className="bg-white p-6 rounded-lg mb-6 shadow-sm">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-2" itemRender={item => item.href
          ? <Link to={item.href}>{item.title}</Link> : item.title} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {showBack && <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Quay lại trang trước" title="Quay lại trang trước" />}
          {title && <h1 className="text-2xl font-bold m-0">{title}</h1>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

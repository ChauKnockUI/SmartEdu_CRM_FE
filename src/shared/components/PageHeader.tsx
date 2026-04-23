import React from 'react';
import { Breadcrumb, Button } from 'antd';
import { Link } from 'react-router';
import type { BreadcrumbProps } from 'antd';

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbProps['items'];
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="bg-white p-6 rounded-lg mb-6 shadow-sm">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-2" />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold m-0">{title}</h1>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

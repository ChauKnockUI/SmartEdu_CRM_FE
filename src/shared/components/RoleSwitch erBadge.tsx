import React from 'react';
import { Tag } from 'antd';
import { useAuth } from '../contexts/AuthContext';

export function RoleSwitcherBadge() {
  const { user } = useAuth();

  const roleColors: Record<string, string> = {
    admin: 'red',
    sale: 'blue',
    teacher: 'green',
    student: 'purple',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    sale: 'Nhân viên Sale',
    teacher: 'Giảng viên',
    student: 'Học viên',
  };

  if (!user) return null;

  return (
    <Tag color={roleColors[user.role]} className="ml-2">
      {roleLabels[user.role]}
    </Tag>
  );
}

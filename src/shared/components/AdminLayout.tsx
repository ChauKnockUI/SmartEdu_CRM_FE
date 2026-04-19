import React, { useState } from 'react';
import { Layout, Menu, Avatar, Badge, Dropdown, Input, Button, Select, MenuProps, Space } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  RobotOutlined,
  SettingOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  CustomerServiceOutlined,
  ReadOutlined,
  CalendarOutlined,
  DollarOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { mockNotifications } from '../../services/mock/mockData';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';
import { RoleGuide } from './RoleGuide';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

// Helper function to filter menu items based on role
function getMenuItemsForRole(role: UserRole): MenuItem[] {
  const allItems: MenuItem[] = [
    getItem('Dashboard', '/dashboard', <DashboardOutlined />),
    getItem('CRM', '/crm', <CustomerServiceOutlined />, [
      getItem('Quản lý Leads', '/crm/leads', <UserOutlined />),
    ]),
    getItem('LMS', '/lms', <BookOutlined />, [
      getItem('Học viên', '/lms/students', <TeamOutlined />),
      getItem('Giảng viên', '/lms/teachers', <ReadOutlined />),
      getItem('Lớp học', '/lms/classes', <BookOutlined />),
      getItem('Lịch học', '/lms/schedule', <CalendarOutlined />),
    ]),
    getItem('Tài chính', '/finance', <DollarOutlined />, [
      getItem('Học phí', '/finance/payments', <DollarOutlined />),
    ]),
    getItem('AI & Insights', '/ai', <RobotOutlined />, [
      getItem('Models', '/ai/models', <RobotOutlined />),
      getItem('Predictions', '/ai/predictions', <DashboardOutlined />),
      getItem('Insights', '/ai/insights', <DashboardOutlined />),
    ]),
    getItem('Cài đặt', '/settings', <SettingOutlined />, [
      getItem('Người dùng', '/settings/users', <TeamOutlined />),
    ]),
  ];

  switch (role) {
    case 'admin':
      // Admin sees everything + Scheduling
      return [
        getItem('Dashboard', '/dashboard', <DashboardOutlined />),
        getItem('CRM', '/crm', <CustomerServiceOutlined />, [
          getItem('Quản lý Leads', '/crm/leads', <UserOutlined />),
        ]),
        getItem('LMS', '/lms', <BookOutlined />, [
          getItem('Học viên', '/lms/students', <TeamOutlined />),
          getItem('Giảng viên', '/lms/teachers', <ReadOutlined />),
          getItem('Lớp học', '/lms/classes', <BookOutlined />),
          getItem('Lịch học', '/lms/schedule', <CalendarOutlined />),
          getItem('Xếp lớp', '/lms/scheduling', <SwapOutlined />),
        ]),
        getItem('Tài chính', '/finance', <DollarOutlined />, [
          getItem('Học phí', '/finance/payments', <DollarOutlined />),
        ]),
        getItem('AI & Insights', '/ai', <RobotOutlined />, [
          getItem('Models', '/ai/models', <RobotOutlined />),
          getItem('Predictions', '/ai/predictions', <DashboardOutlined />),
          getItem('Insights', '/ai/insights', <DashboardOutlined />),
        ]),
        getItem('Cài đặt', '/settings', <SettingOutlined />, [
          getItem('Người dùng', '/settings/users', <TeamOutlined />),
        ]),
      ];

    case 'sale':
      // Sale sees: Dashboard, CRM, LMS (students, classes, schedule), Finance (payments)
      return [
        getItem('Dashboard', '/dashboard', <DashboardOutlined />),
        getItem('CRM', '/crm', <CustomerServiceOutlined />, [
          getItem('Quản lý Leads', '/crm/leads', <UserOutlined />),
        ]),
        getItem('LMS', '/lms', <BookOutlined />, [
          getItem('Học viên', '/lms/students', <TeamOutlined />),
          getItem('Lớp học', '/lms/classes', <BookOutlined />),
          getItem('Lịch học', '/lms/schedule', <CalendarOutlined />),
        ]),
        getItem('Tài chính', '/finance', <DollarOutlined />, [
          getItem('Học phí', '/finance/payments', <DollarOutlined />),
        ]),
      ];

    case 'teacher':
      // Teacher sees: Dashboard, LMS (my schedule, classes only - students are managed within classes)
      return [
        getItem('Dashboard', '/dashboard', <DashboardOutlined />),
        getItem('LMS', '/lms', <BookOutlined />, [
          getItem('Lịch dạy', '/lms/myschedule', <CalendarOutlined />),
          getItem('Lớp học', '/lms/classes', <BookOutlined />),
        ]),
      ];

    case 'student':
      // Student sees: Dashboard, LMS (my classes, my schedule)
      return [
        getItem('Dashboard', '/dashboard', <DashboardOutlined />),
        getItem('LMS', '/lms', <BookOutlined />, [
          getItem('Lịch học của tôi', '/lms/myschedule', <CalendarOutlined />),
          getItem('Lớp học của tôi', '/lms/classes', <BookOutlined />),
        ]),
      ];

    default:
      return allItems;
  }
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, switchRole, logout} = useAuth();

  const unreadCount = mockNotifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin tài khoản',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    {
      key: 'divider-1',
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const notificationItems: MenuProps['items'] = mockNotifications.map(notification => ({
    key: notification.id,
    label: (
      <div className="py-2" style={{ width: 300 }}>
        <div className="font-semibold">{notification.title}</div>
        <div className="text-sm text-gray-600">{notification.content}</div>
        <div className="text-xs text-gray-400 mt-1">
          {notification.interaction_time.toLocaleString('vi-VN')}
        </div>
      </div>
    ),
    onClick: () => notification.link && navigate(notification.link),
  }));

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          {!collapsed ? (
            <h1 className="text-white text-xl font-bold">EduCRM System</h1>
          ) : (
            <h1 className="text-white text-xl font-bold">EC</h1>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/crm', '/lms', '/ai']}
          items={getMenuItemsForRole(user?.role || 'admin')}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px' }}
            />
            <Input
              placeholder="Tìm kiếm lead, học viên, lớp học..."
              prefix={<SearchOutlined />}
              style={{ width: 350 }}
              size="middle"
            />
          </div>
          <div className="flex items-center gap-4">
            {/* Role Switcher for Demo */}
            <Space>
              <SwapOutlined />
              <Select
                value={user?.role}
                onChange={handleRoleChange}
                style={{ width: 120 }}
                options={[
                  { label: 'Admin', value: 'admin' },
                  { label: 'Sale', value: 'sale' },
                  { label: 'Teacher', value: 'teacher' },
                  { label: 'Student', value: 'student' },
                ]}
              />
            </Space>

            {/* Help Button */}
            <Button
              type="text"
              icon={<QuestionCircleOutlined style={{ fontSize: '18px' }} />}
              size="large"
              onClick={() => setGuideVisible(true)}
              title="Hướng dẫn sử dụng"
            />

            <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight">
              <Badge count={unreadCount} offset={[-5, 5]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: '18px' }} />}
                  size="large"
                />
              </Badge>
            </Dropdown>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar size="default">
                  {user?.name?.[0] || 'U'}
                </Avatar>
                <div className="hidden md:block">
                  <div className="font-medium">{user?.name || 'User'}</div>
                  <div className="text-xs text-gray-500">{user?.role || 'Guest'}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            minHeight: 280,
            background: '#f0f2f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      <RoleGuide visible={guideVisible} onClose={() => setGuideVisible(false)} role={user?.role || 'admin'} />
    </Layout>
  );
}
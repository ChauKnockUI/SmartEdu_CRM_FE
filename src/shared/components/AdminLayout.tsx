import { useState } from 'react';
import { Avatar, Badge, Button, Dropdown, Empty, Input, Layout, Menu, type MenuProps } from 'antd';
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DollarOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { RoleGuide } from './RoleGuide';

const { Header, Sider, Content } = Layout;
type MenuItem = Required<MenuProps>['items'][number];

function getItem(label: string, key: string, icon?: React.ReactNode, children?: MenuItem[]): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

function getMenuItemsForRole(role: UserRole): MenuItem[] {
  if (role === 'sale') {
    return [
      getItem('Dashboard', '/dashboard', <DashboardOutlined />),
      getItem('CRM', '/crm', <CustomerServiceOutlined />, [
        getItem('Quản lý leads', '/crm/leads', <UserOutlined />),
      ]),
      getItem('Tài chính', '/finance', <DollarOutlined />, [
        getItem('Khoản phải thu', '/finance/invoices', <DollarOutlined />),
        getItem('Thanh toán', '/finance/payments', <DollarOutlined />),
        getItem('Công nợ', '/finance/debts', <DollarOutlined />),
      ]),
    ];
  }

  if (role === 'teacher') {
    return [
      getItem('Dashboard', '/dashboard', <DashboardOutlined />),
      getItem('LMS', '/lms', <BookOutlined />, [
        getItem('Lịch dạy', '/lms/myschedule', <CalendarOutlined />),
        getItem('Lớp học', '/lms/classes', <BookOutlined />),
      ]),
      getItem('Dropout Risk', '/ai/predictions', <RobotOutlined />),
    ];
  }

  if (role === 'student') {
    return [
      getItem('Dashboard', '/dashboard', <DashboardOutlined />),
      getItem('LMS', '/lms', <BookOutlined />, [
        getItem('Lịch học của tôi', '/lms/myschedule', <CalendarOutlined />),
        getItem('Lớp học của tôi', '/lms/classes', <BookOutlined />),
      ]),
    ];
  }

  return [
    getItem('Dashboard', '/dashboard', <DashboardOutlined />),
    getItem('CRM', '/crm', <CustomerServiceOutlined />, [
      getItem('Quản lý leads', '/crm/leads', <UserOutlined />),
    ]),
    getItem('LMS', '/lms', <BookOutlined />, [
      getItem('Học viên', '/lms/students', <TeamOutlined />),
      getItem('Giảng viên', '/lms/teachers', <ReadOutlined />),
      getItem('Khóa học', '/lms/courses', <ReadOutlined />),
      getItem('Phòng học', '/lms/rooms', <HomeOutlined />),
      getItem('Lớp học', '/lms/classes', <BookOutlined />),
      getItem('Lịch học', '/lms/schedule', <CalendarOutlined />),
      getItem('Xếp lớp', '/lms/scheduling', <SwapOutlined />),
    ]),
    getItem('Tài chính', '/finance', <DollarOutlined />, [
      getItem('Khoản phải thu', '/finance/invoices', <DollarOutlined />),
      getItem('Thanh toán', '/finance/payments', <DollarOutlined />),
      getItem('Công nợ', '/finance/debts', <DollarOutlined />),
    ]),
    getItem('AI & Insights', '/ai', <RobotOutlined />, [
      getItem('Models', '/ai/models', <RobotOutlined />),
      getItem('Dropout Risk', '/ai/predictions', <DashboardOutlined />),
      getItem('Demo Insights', '/ai/insights', <DashboardOutlined />),
    ]),
    getItem('Cài đặt', '/settings', <SettingOutlined />, [
      getItem('Người dùng', '/settings/users', <TeamOutlined />),
    ]),
  ];
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Thông tin tài khoản' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
    { key: 'divider-1', type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
  ];

  const notificationItems: MenuProps['items'] = [
    {
      key: 'empty',
      disabled: true,
      label: (
        <div style={{ width: 280 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo mới" />
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={248}
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          <h1 className="text-white text-lg font-semibold">{collapsed ? 'SE' : 'SmartEdu CRM'}</h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/crm', '/lms', '/finance', '/ai', '/settings']}
          items={getMenuItemsForRole(user?.role || 'admin')}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 248, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 20px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <Input
              placeholder="Tìm lead, học viên, lớp học..."
              prefix={<SearchOutlined />}
              style={{ width: 320 }}
              className="hidden md:flex"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />}
              onClick={() => setGuideVisible(true)}
              title="Hướng dẫn sử dụng"
            />
            <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight">
              <Badge count={0}>
                <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
              </Badge>
            </Dropdown>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <div className="flex cursor-pointer items-center gap-2">
                <Avatar>{user?.name?.[0] || 'U'}</Avatar>
                <div className="hidden md:block">
                  <div className="font-medium leading-5">{user?.name || 'User'}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role || 'guest'}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 20, padding: 0, minHeight: 280, background: '#f5f6f8' }}>
          <Outlet />
        </Content>
      </Layout>

      <RoleGuide visible={guideVisible} onClose={() => setGuideVisible(false)} role={user?.role || 'admin'} />
    </Layout>
  );
}

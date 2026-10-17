import { useState, useEffect } from 'react';
import { Avatar, Badge, Button, Dropdown, Empty, Input, Layout, Menu, Space, Typography, type MenuProps } from 'antd';
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
  ExclamationCircleFilled,
  ClockCircleFilled,
  InfoCircleFilled,
  CheckOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { RoleGuide } from './RoleGuide';
import { notificationService, type NotificationItem } from '../../services/api/notification.service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

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

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await notificationService.getMyNotifications();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: number, link?: string | null) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifOpen(false);
      if (link) {
        navigate(link);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'overdue_attendance':
        return <ExclamationCircleFilled className="text-red-500 text-lg" />;
      case 'attendance_reminder':
        return <ClockCircleFilled className="text-amber-500 text-lg" />;
      case 'system_alert':
        return <ExclamationCircleFilled className="text-orange-500 text-lg" />;
      default:
        return <InfoCircleFilled className="text-blue-500 text-lg" />;
    }
  };

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
            <Dropdown
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open) fetchNotifications();
              }}
              trigger={['click']}
              placement="bottomRight"
              dropdownRender={() => (
                <div className="w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <BellOutlined className="text-lg" />
                      <span className="font-semibold text-sm">Thông báo hệ thống</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-red-500 rounded-full font-bold">
                          {unreadCount} mới
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        type="link"
                        size="small"
                        className="text-white hover:text-blue-100 p-0 text-xs font-medium"
                        onClick={handleMarkAllAsRead}
                      >
                        Đã đọc tất cả
                      </Button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo nào" />
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id, notif.link)}
                          className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-3 ${
                            !notif.is_read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-xs ${!notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-750'} truncate`}>
                                {notif.title}
                              </span>
                              {!notif.is_read && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-1.5 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[11px] text-gray-400">
                              {dayjs(notif.createdAt).fromNow()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            >
              <Badge count={unreadCount} overflowCount={99}>
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

import { useState, useEffect, useRef } from 'react';
import { Avatar, Badge, Button, Dropdown, Empty, Input, Layout, Menu, Spin, message, type MenuProps } from 'antd';
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
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { RoleGuide } from './RoleGuide';
import { notificationService, type NotificationItem } from '../../services/api/notification.service';
import { activeMenuKey, type NavigationContext } from '../utils/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Sider, Content } = Layout;
type MenuItem = Required<MenuProps>['items'][number];

type MarkTarget = number | 'all';
interface NotificationState {
  scope: string;
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string;
  markError: { target: MarkTarget; message: string } | null;
  pending: MarkTarget[];
  open: boolean;
}

const emptyNotifications = (scope: string): NotificationState => ({
  scope, items: [], unread: 0, loading: !!scope, error: '', markError: null, pending: [], open: false,
});

// Only app paths are navigable, including when a mark request fails.
function internalNotificationLink(link?: string | null): string | null {
  if (!link || !/^\/(?!\/)/.test(link) || /[\\\s\u0000-\u001f\u007f]/.test(link)) return null;
  try {
    const url = new URL(link, window.location.origin);
    return url.origin === window.location.origin && /^\/(?!\/)/.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

function getItem(label: string, key: string, icon?: React.ReactNode, children?: MenuItem[]): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

function leafMenuKeys(items: MenuItem[]): string[] {
  return items.flatMap(item => !item ? [] : 'children' in item && item.children
    ? leafMenuKeys(item.children as MenuItem[]) : item.key ? [String(item.key)] : []);
}

export function getMenuItemsForRole(role: UserRole): MenuItem[] {
  if (role === 'sale') {
    return [
      getItem('Dashboard', '/dashboard', <DashboardOutlined />),
      getItem('CRM', '/crm', <CustomerServiceOutlined />, [
        getItem('Quản lý leads', '/crm/leads', <UserOutlined />),
        getItem('Học viên phụ trách', '/lms/students', <TeamOutlined />),
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
        getItem('Học viên trong lớp', '/lms/students', <TeamOutlined />),
      ]),
      getItem('Cảnh báo bỏ học', '/ai/predictions', <RobotOutlined />),
    ];
  }

  if (role === 'student') {
    return [
      getItem('Dashboard', '/dashboard', <DashboardOutlined />),
      getItem('LMS', '/lms', <BookOutlined />, [
        getItem('Lịch học của tôi', '/lms/myschedule', <CalendarOutlined />),
        getItem('Lớp học của tôi', '/lms/classes', <BookOutlined />),
        getItem('Hồ sơ của tôi', '/lms/my-profile', <UserOutlined />),
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
      getItem('Cảnh báo bỏ học', '/ai/predictions', <DashboardOutlined />),
      getItem('Demo Insights', '/ai/insights', <DashboardOutlined />),
    ]),
    getItem('Cài đặt', '/settings', <SettingOutlined />, [
      getItem('Người dùng', '/settings/users', <TeamOutlined />),
    ]),
  ];
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (!mobile || collapsed) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setCollapsed(true); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobile, collapsed]);
  const [guideVisible, setGuideVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const menuItems = getMenuItemsForRole(user?.role || 'admin');
  const selectedMenuKey = user?.role === 'student' && /^\/lms\/students\/[^/]+\/?$/.test(location.pathname)
    ? '/lms/my-profile' : activeMenuKey(location.pathname, leafMenuKeys(menuItems), (location.state as NavigationContext | null)?.menuKey);
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>([]);
  useEffect(() => {
    const parent = menuItems.find(item => item && 'children' in item
      && item.children?.some(child => child && String(child.key) === selectedMenuKey));
    if (parent?.key) setOpenMenuKeys(current => Array.from(new Set([...current, String(parent.key)])));
  }, [selectedMenuKey]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Thông tin tài khoản',
      ...(user?.role === 'student' ? { onClick: () => navigate('/lms/my-profile') } : {}) },
    { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
    { key: 'divider-1', type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
  ];

  const notificationScope = user && token ? JSON.stringify([user.id, user.role, token]) : '';
  const currentNotificationScope = useRef(notificationScope);
  currentNotificationScope.current = notificationScope;
  const notificationRequest = useRef(0);
  const notificationActions = useRef<{
    scope: string;
    refresh: () => void;
    mark: (target: MarkTarget) => void;
  } | null>(null);
  const [notificationState, setNotificationState] = useState(() => emptyNotifications(''));
  // Hide the previous actor's data during render, before effect cleanup runs.
  const visibleNotifications = notificationState.scope === notificationScope
    ? notificationState : emptyNotifications(notificationScope);
  const { items: notifications, unread: unreadCount, loading: loadingNotifs,
    error: notifError, markError, pending: pendingMarks, open: notifOpen } = visibleNotifications;

  useEffect(() => {
    setNotificationState(emptyNotifications(notificationScope));
    if (!notificationScope || !token) return;
    const controller = new AbortController();
    const options = { token, signal: controller.signal };
    const isCurrent = () => !controller.signal.aborted && currentNotificationScope.current === notificationScope;
    const update = (change: (previous: NotificationState) => NotificationState) => {
      if (isCurrent()) setNotificationState(previous =>
        isCurrent() && previous.scope === notificationScope ? change(previous) : previous);
    };
    // One queue per actor/token: polls never overlap marks or overwrite their result.
    let queue = Promise.resolve();
    const enqueue = (operation: () => Promise<void>) => {
      queue = queue.then(async () => { if (isCurrent()) await operation(); });
    };
    let refreshQueued = false;
    let refreshVersion = 0;
    const pending = new Set<MarkTarget>();
    const refresh = () => {
      if (!isCurrent()) return;
      refreshVersion++;
      if (refreshQueued) return;
      refreshQueued = true;
      enqueue(async () => {
        const version = refreshVersion;
        const request = ++notificationRequest.current;
        update(previous => ({ ...previous, loading: true, error: '' }));
        try {
          const res = await notificationService.getMyNotifications(30, options);
          if (request === notificationRequest.current) update(previous => ({
            ...previous, items: res.data || [], unread: res.unread_count || 0,
          }));
        } catch (error) {
          if (request === notificationRequest.current) update(previous => ({
            ...previous, error: error instanceof Error ? error.message : 'Không tải được thông báo.',
          }));
        } finally {
          update(previous => ({ ...previous, loading: false }));
          refreshQueued = false;
          // Focus/open/events during a request still receive a fresh snapshot afterwards.
          if (version !== refreshVersion) refresh();
        }
      });
    };
    const mark = (target: MarkTarget) => {
      if (!isCurrent() || pending.has(target) || pending.has('all') || (target === 'all' && pending.size > 0)) return;
      pending.add(target);
      update(previous => ({ ...previous, pending: [...pending], markError: null }));
      enqueue(async () => {
        const request = ++notificationRequest.current;
        try {
          if (target === 'all') await notificationService.markAllAsRead(options);
          else await notificationService.markAsRead(target, options);
          if (request === notificationRequest.current) update(previous => {
            const wasUnread = previous.items.some(item => item.id === target && !item.is_read);
            return { ...previous,
              items: previous.items.map(item => target === 'all' || item.id === target ? { ...item, is_read: true } : item),
              unread: target === 'all' ? 0 : Math.max(0, previous.unread - (wasUnread ? 1 : 0)),
            };
          });
        } catch (error) {
          if (isCurrent() && request === notificationRequest.current) {
            const text = error instanceof Error ? error.message : 'Không đánh dấu đã đọc được.';
            update(previous => ({ ...previous, markError: { target, message: text } }));
            // Item navigation closes the popup; the failure must still be visible.
            message.error(text);
          }
        } finally {
          pending.delete(target);
          update(previous => ({ ...previous, pending: [...pending] }));
          refresh();
        }
      });
    };
    notificationActions.current = { scope: notificationScope, refresh, mark };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('crm:notifications-changed', refresh);
    return () => {
      controller.abort();
      notificationRequest.current++;
      notificationActions.current = null;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('crm:notifications-changed', refresh);
    };
  }, [notificationScope, token]);

  const fetchNotifications = () => {
    if (notificationActions.current?.scope === notificationScope) notificationActions.current.refresh();
  };
  const markNotification = (target: MarkTarget) => {
    if (notificationActions.current?.scope === notificationScope) notificationActions.current.mark(target);
  };
  const setNotifOpen = (open: boolean) => setNotificationState(previous =>
    previous.scope === notificationScope ? { ...previous, open } : previous);
  const handleMarkAsRead = (notif: NotificationItem) => {
    if (currentNotificationScope.current !== notificationScope) return;
    if (!notif.is_read) markNotification(notif.id);
    setNotifOpen(false);
    const link = internalNotificationLink(notif.link);
    if (link) navigate(link);
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
    <Layout className="crm-app" style={{ minHeight: '100vh' }}>
      {mobile && !collapsed && <button type="button" className="crm-nav-backdrop" aria-label="Đóng menu điều hướng" onClick={() => setCollapsed(true)} />}
      <Sider
        className="crm-sidebar"
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={248}
        breakpoint="md"
        collapsedWidth={mobile ? 0 : 80}
        onBreakpoint={broken => { setMobile(broken); setCollapsed(broken); }}
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}
      >
        <div className="crm-brand">
          <span className="crm-brand-mark"><BookOutlined /></span>
          {!collapsed && <span className="crm-brand-name">SmartEdu CRM</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedMenuKey ? [selectedMenuKey] : []}
          openKeys={openMenuKeys}
          onOpenChange={setOpenMenuKeys}
          items={menuItems}
          onClick={({ key }) => { navigate(key); if (mobile) setCollapsed(true); }}
        />
      </Sider>

      <Layout className="crm-main-layout" style={{ marginLeft: mobile ? 0 : collapsed ? 80 : 248, transition: 'margin-left 0.2s' }}>
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
              aria-label={collapsed ? 'Mở menu điều hướng' : 'Thu gọn menu điều hướng'}
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
                        loading={pendingMarks.includes('all')}
                        disabled={pendingMarks.length > 0}
                        onClick={() => markNotification('all')}
                      >
                        Đã đọc tất cả
                      </Button>
                    )}
                  </div>

                  {loadingNotifs && (
                    <div role="status" className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                      <Spin size="small" /> Đang tải thông báo...
                    </div>
                  )}
                  {notifError && (
                    <div role="alert" className="px-4 py-2 text-xs text-red-600 bg-red-50 flex items-center justify-between gap-2">
                      <span>{notifError}</span>
                      <Button size="small" type="link" disabled={loadingNotifs} onClick={fetchNotifications}>Thử lại</Button>
                    </div>
                  )}
                  {markError && (
                    <div role="alert" className="px-4 py-2 text-xs text-red-600 bg-red-50 flex items-center justify-between gap-2">
                      <span>{markError.message}</span>
                      <Button size="small" type="link" disabled={pendingMarks.length > 0}
                        onClick={() => markNotification(markError.target)}>Thử lại</Button>
                    </div>
                  )}
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      !loadingNotifs && !notifError && <div className="p-8 text-center">
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo nào" />
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif)}
                          aria-busy={pendingMarks.includes(notif.id) || pendingMarks.includes('all')}
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
                              {pendingMarks.includes(notif.id) ? <Spin size="small" /> : !notif.is_read && (
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

        <Content className="crm-content" style={{ padding: 0, minHeight: 280, background: 'transparent' }}>
          <Outlet />
        </Content>
      </Layout>

      <RoleGuide visible={guideVisible} onClose={() => setGuideVisible(false)} role={user?.role || 'admin'} />
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { Building2, Layers, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, UserCircle, X } from 'lucide-react';
import { usePlatformAuth } from './lib/auth';
import { Avatar, Button } from './ui';

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg className="pf-brand-mark" width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <rect width="36" height="36" rx="11" fill="var(--accent)" />
      <rect x="9" y="19" width="5" height="8" rx="2.5" fill="#fff" />
      <rect x="15.5" y="14" width="5" height="13" rx="2.5" fill="#fff" />
      <rect x="22" y="9" width="5" height="18" rx="2.5" fill="#fff" opacity="0.85" />
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/tenants', label: 'Trung tâm', icon: Building2 },
  { to: '/plans', label: 'Gói dịch vụ', icon: Layers },
  { to: '/admins', label: 'Quản trị viên', icon: ShieldCheck },
];

const TITLES: [RegExp, string][] = [
  [/^\/tenants\/\d+/, 'Chi tiết trung tâm'],
  [/^\/tenants/, 'Trung tâm'],
  [/^\/plans/, 'Gói dịch vụ'],
  [/^\/admins/, 'Quản trị viên'],
  [/^\/account/, 'Tài khoản'],
  [/^\//, 'Tổng quan'],
];
const titleFor = (path: string) => TITLES.find(([re]) => re.test(path))?.[1] ?? 'SmartEdu';

const SEARCH_ID = 'pf-search';

function SideSearch({ primary, onDone }: { primary?: boolean; onDone?: () => void }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      className="pf-side-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        nav(q.trim() ? `/tenants?search=${encodeURIComponent(q.trim())}` : '/tenants');
        setQ('');
        (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.blur();
        onDone?.();
      }}
    >
      <Search aria-hidden />
      <input id={primary ? SEARCH_ID : undefined} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trung tâm" aria-label="Tìm trung tâm theo tên hoặc subdomain" />
      {primary && <kbd aria-hidden>/</kbd>}
    </form>
  );
}

function SideContent({ primary, onNavigate }: { primary?: boolean; onNavigate?: () => void }) {
  const { admin, logout } = usePlatformAuth();
  return (
    <>
      <div className="pf-brand">
        <BrandMark />
        <div>
          <div className="pf-brand-name">SmartEdu</div>
          <div className="pf-brand-scope">Quản trị nền tảng</div>
        </div>
      </div>
      <SideSearch primary={primary} onDone={onNavigate} />
      <nav className="pf-nav" aria-label="Điều hướng chính">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}>
            <Icon aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
      <div className="pf-side-foot">
        <nav className="pf-nav" aria-label="Tài khoản">
          <NavLink to="/account" onClick={onNavigate}><UserCircle aria-hidden />Tài khoản</NavLink>
        </nav>
        {admin && (
          <div className="pf-user">
            <Avatar name={admin.full_name} />
            <div>
              <div className="pf-user-name">{admin.full_name}</div>
              <div className="pf-user-mail">{admin.email}</div>
            </div>
            <Button sm icon variant="ghost" aria-label="Đăng xuất" title="Đăng xuất" onClick={logout}><LogOut /></Button>
          </div>
        )}
      </div>
    </>
  );
}

export function Shell() {
  const { status } = usePlatformAuth();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { document.title = `${titleFor(loc.pathname)} · SmartEdu Super Admin`; }, [loc.pathname]);
  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        const input = document.getElementById(SEARCH_ID);
        if (input && input.offsetParent !== null) { e.preventDefault(); input.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (status === 'loading') return <div className="pf" aria-busy="true" />;
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;

  return (
    <div className="pf pf-app">
      <aside className="pf-side"><SideContent primary /></aside>

      <header className="pf-top">
        <Button icon variant="ghost" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu /></Button>
        <div className="pf-brand"><BrandMark size={30} /><span className="pf-brand-name">SmartEdu</span></div>
      </header>

      <main className="pf-sheet" id="main">
        <Outlet />
      </main>

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="pf-portal pf-overlay" />
          <Dialog.Content className="pf-portal pf-drawer" aria-describedby={undefined}>
            <Dialog.Title className="sr">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <Button icon variant="ghost" className="pf-drawer-close" aria-label="Đóng menu"><X /></Button>
            </Dialog.Close>
            <SideContent onNavigate={() => setMenuOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

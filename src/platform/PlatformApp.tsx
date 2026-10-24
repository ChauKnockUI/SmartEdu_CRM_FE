import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Link } from 'react-router';
import { Toaster } from 'sonner';
import './platform.css';
import { PlatformAuthProvider } from './lib/auth';
import { Shell } from './Shell';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { TenantsPage } from './pages/Tenants';
import { TenantDetailPage } from './pages/TenantDetail';
import { PlansPage } from './pages/Plans';
import { AdminsPage } from './pages/Admins';
import { AccountPage } from './pages/Account';

/** Trên host admin.* chạy ở gốc; khi dev (localhost:5173/platform) chạy dưới /platform. */
const basename = window.location.pathname.startsWith('/platform') ? '/platform' : '/';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <Shell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'tenants', element: <TenantsPage /> },
      { path: 'tenants/:id', element: <TenantDetailPage /> },
      { path: 'plans', element: <PlansPage /> },
      { path: 'admins', element: <AdminsPage /> },
      { path: 'account', element: <AccountPage /> },
      {
        path: '*',
        element: (
          <div className="pf-page">
            <div className="pf-titlerow"><div><h1>Không tìm thấy trang</h1><p className="sub">Đường dẫn này không tồn tại trong console.</p></div></div>
            <Link className="pf-btn" to="/">Về Tổng quan</Link>
          </div>
        ),
      },
    ],
  },
], { basename });

/** Font của console chỉ nạp khi vào console, không ảnh hưởng ứng dụng trung tâm. */
function loadFont() {
  if (document.getElementById('pf-font')) return;
  const pre1 = Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.googleapis.com' });
  const pre2 = Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' });
  const css = Object.assign(document.createElement('link'), {
    id: 'pf-font',
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  });
  document.head.append(pre1, pre2, css);
}

export function mountPlatform(el: HTMLElement) {
  loadFont();
  createRoot(el).render(
    <StrictMode>
      <PlatformAuthProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', borderRadius: 16, border: 0, boxShadow: '0 2px 8px rgba(16, 32, 64, 0.08), 0 16px 40px rgba(16, 32, 64, 0.14)' } }} />
      </PlatformAuthProvider>
    </StrictMode>,
  );
}

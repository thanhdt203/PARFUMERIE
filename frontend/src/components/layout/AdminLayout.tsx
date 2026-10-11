import { Suspense, useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { findNavItem } from '../../lib/adminNav';
import { cn } from '../../lib/cn';
import { useAdminTheme } from '../../hooks/useAdminTheme';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../store/uiStore';
import ToastViewport from '../common/Toast';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AdminLayout() {
  useAdminTheme();

  const { pathname } = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileOpen = useUiStore((state) => state.mobileSidebarOpen);
  const closeMobile = useUiStore((state) => state.closeMobileSidebar);

  // kéo rộng màn hình lên desktop khi drawer đang mở -> đóng drawer
  useEffect(() => {
    if (isDesktop && mobileOpen) closeMobile();
  }, [isDesktop, mobileOpen, closeMobile]);

  // tiêu đề tab trình duyệt theo trang
  useEffect(() => {
    const previous = document.title;
    const page = findNavItem(pathname)?.label;
    document.title = page ? `${page} - Quản trị Parfumerie` : 'Quản trị Parfumerie';
    return () => {
      document.title = previous;
    };
  }, [pathname]);

  return (
    <div className="admin-root min-h-svh bg-page font-sans text-ink">
      <Sidebar />
      <div
        className={cn(
          'flex min-h-svh flex-col transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-64',
        )}
      >
        <Header />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Suspense
              fallback={
                <div className="grid place-items-center py-24 text-ink-muted" role="status">
                  <LoaderCircle className="size-6 animate-spin" aria-label="Đang tải trang" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Modal render vào đây để vẫn nhận CSS của khu admin */}
      <div id="admin-portal" />
      <ToastViewport />
    </div>
  );
}

import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavGroupsForRole } from '../../lib/adminNav';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

export default function Sidebar() {
  const { role } = useAuth();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileOpen = useUiStore((state) => state.mobileSidebarOpen);
  const toggleCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const closeMobile = useUiStore((state) => state.closeMobileSidebar);

  const groups = getNavGroupsForRole(role);

  // drawer mobile: Escape để đóng, khóa cuộn trang phía sau
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, closeMobile]);

  // Nhãn chữ ẩn đi khi sidebar thu gọn (chỉ trên desktop, drawer mobile luôn đầy đủ)
  const labelClass = collapsed ? 'lg:hidden' : '';

  return (
    <>
      {mobileOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-scrim lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        aria-label="Menu quản trị"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-side text-side-ink',
          'transition-[transform,width] duration-200 ease-out',
          mobileOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
          'lg:max-w-none lg:translate-x-0 lg:shadow-none',
          collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center justify-between border-b border-side-line px-5',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <NavLink
            to="/admin/dashboard"
            onClick={closeMobile}
            className="flex items-center gap-3 rounded-control"
            aria-label="Parfumerie, về Dashboard"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-mint text-lg font-bold text-side">
              P
            </span>
            <span className={cn('text-lg font-bold tracking-wide text-side-ink-strong', labelClass)}>
              Parfumerie
            </span>
          </NavLink>
          <button
            type="button"
            onClick={closeMobile}
            className="grid size-9 place-items-center rounded-control text-side-ink hover:bg-side-hover hover:text-side-ink-strong lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, index) => (
            <div key={group.label} className={cn(index > 0 && 'mt-5')}>
              <p
                className={cn(
                  'mb-1.5 px-3 text-xs font-medium text-side-ink/60',
                  labelClass,
                )}
              >
                {group.label}
              </p>
              {/* khi thu gọn: đường kẻ thay cho tên nhóm */}
              {index > 0 && (
                <div
                  className={cn(
                    'mx-3 mb-2 hidden border-t border-side-line',
                    collapsed && 'lg:block',
                  )}
                />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={closeMobile}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-side-active text-mint before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-mint'
                            : 'text-side-ink hover:bg-side-hover hover:text-side-ink-strong',
                          collapsed && 'lg:justify-center lg:px-0',
                        )
                      }
                    >
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className={cn('truncate', labelClass)}>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Nút thu gọn (chỉ desktop) */}
        <div className="hidden shrink-0 border-t border-side-line p-3 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            title={collapsed ? 'Mở rộng sidebar' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-side-ink transition-colors hover:bg-side-hover hover:text-side-ink-strong',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="size-5 shrink-0" aria-hidden="true" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { findNavItem } from '../../lib/adminNav';
import { useUiStore } from '../../store/uiStore';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

export default function Header() {
  const { pathname } = useLocation();
  const mobileOpen = useUiStore((state) => state.mobileSidebarOpen);
  const openMobile = useUiStore((state) => state.openMobileSidebar);

  const title = findNavItem(pathname)?.label ?? 'Quản trị';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={openMobile}
        className="grid size-10 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
        aria-label="Mở menu"
        aria-controls="admin-sidebar"
        aria-expanded={mobileOpen}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{title}</h1>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

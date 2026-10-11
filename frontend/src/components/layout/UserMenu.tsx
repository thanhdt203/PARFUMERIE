import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDismiss } from '../../hooks/useDismiss';
import { cn } from '../../lib/cn';
import { getDisplayName, getInitials, ROLE_LABEL } from '../../lib/user';

const itemClass =
  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-muted';

export default function UserMenu() {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);

  const name = getDisplayName(user);
  const roleLabel = role ? ROLE_LABEL[role] : '';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      // role về null -> RoleRoute tự chuyển về /login
    } catch {
      // signOut đã xóa state phía client dù API lỗi, không cần xử lý thêm
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-control py-1 pr-2 pl-1 transition-colors hover:bg-surface-muted"
      >
        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
          {getInitials(name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-medium text-ink">{name}</span>
          <span className="block text-xs text-ink-muted">{roleLabel}</span>
        </span>
        <ChevronDown
          className={cn('hidden size-4 text-ink-muted transition-transform sm:block', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-pop-in absolute right-0 z-50 mt-2 w-60 origin-top-right rounded-card border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="px-3 py-2.5 sm:hidden">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="text-xs text-ink-muted">{roleLabel}</p>
          </div>

          <Link to="/" role="menuitem" onClick={close} className={itemClass}>
            <Store className="size-4 text-ink-muted" aria-hidden="true" />
            Xem cửa hàng
          </Link>
          {role === 'admin' && (
            <Link to="/admin/cai-dat" role="menuitem" onClick={close} className={itemClass}>
              <Settings className="size-4 text-ink-muted" aria-hidden="true" />
              Cài đặt
            </Link>
          )}

          <div className="my-1.5 border-t border-line" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className={cn(itemClass, 'text-danger disabled:opacity-60')}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      )}
    </div>
  );
}

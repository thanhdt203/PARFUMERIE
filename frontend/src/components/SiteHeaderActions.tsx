import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, LayoutDashboard, LogOut, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import { useDismiss } from '../hooks/useDismiss';
import { getDisplayName, getInitials } from '../lib/user';

interface SiteHeaderActionsProps {
  /** Số sản phẩm yêu thích, chưa có API nên mặc định 0 (ẩn badge) */
  wishlistCount?: number;
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="site__badge" aria-hidden="true">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Chưa đăng nhập: bấm vào đi tới trang đăng nhập.
// Đã đăng nhập: hiện avatar chữ cái đầu, bấm mở menu (quản trị cho nhân viên/admin, đăng xuất).
function AccountButton() {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);

  if (!role) {
    return (
      <Link to="/login" className="site__icon-btn" aria-label="Đăng nhập" title="Đăng nhập">
        <User size={20} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    );
  }

  const name = getDisplayName(user);
  const canManage = role === 'staff' || role === 'admin';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // signOut đã xóa trạng thái phía client dù API lỗi, không cần xử lý thêm
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="site__account">
      <button
        type="button"
        className="site__icon-btn"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản: ${name}`}
        title={name}
      >
        <span className="site__avatar" aria-hidden="true">
          {getInitials(name)}
        </span>
      </button>

      {open && (
        <div role="menu" className="site__menu">
          <p className="site__menu-name">{name}</p>
          {canManage && (
            <Link to="/admin" role="menuitem" className="site__menu-item" onClick={close}>
              <LayoutDashboard size={16} strokeWidth={1.75} aria-hidden="true" />
              Vào trang quản trị
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="site__menu-item site__menu-item--danger"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            {signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeaderActions({ wishlistCount = 0 }: SiteHeaderActionsProps) {
  const cartCount = useCartStore((state) => state.tongSoLuong);

  return (
    <div className="site__actions">
      <AccountButton />

      <Link
        to="/gio-hang"
        className="site__icon-btn"
        aria-label={cartCount > 0 ? `Giỏ hàng, ${cartCount} sản phẩm` : 'Giỏ hàng'}
        title="Giỏ hàng"
      >
        <ShoppingCart size={20} strokeWidth={1.75} aria-hidden="true" />
        <Badge count={cartCount} />
      </Link>

      <Link
        to="/yeu-thich"
        className="site__icon-btn"
        aria-label={wishlistCount > 0 ? `Yêu thích, ${wishlistCount} sản phẩm` : 'Yêu thích'}
        title="Yêu thích"
      >
        <Heart size={20} strokeWidth={1.75} aria-hidden="true" />
        <Badge count={wishlistCount} />
      </Link>
    </div>
  );
}
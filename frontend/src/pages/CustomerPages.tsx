import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { ReactNode } from 'react';
import ProductGrid from '../components/home/ProductGrid';
import SiteLayout from '../components/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useWishlistStore } from '../store/wishlistStore';

// Trang Yêu thích: danh sách lấy từ useWishlistStore (đồng bộ bởi WishlistSync), bỏ tim ở thẻ là thẻ biến mất.

function Notice({ title, text, to, action }: { title: string; text: string; to: string; action: string }) {
  return (
    <div className="site__empty">
      <Heart className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />
      <h1>{title}</h1>
      <p>{text}</p>
      <Link to={to} className="site__empty-link">
        {action}
      </Link>
    </div>
  );
}

export function WishlistPage() {
  const { role, loading: authLoading } = useAuth();
  const { items, loaded, loading, error, load } = useWishlistStore();

  let content: ReactNode;
  if (authLoading) {
    content = <ProductGrid title="Yêu thích" />;
  } else if (!role) {
    content = (
      <Notice
        title="Đăng nhập để lưu sản phẩm yêu thích"
        text="Danh sách yêu thích sẽ gắn với tài khoản của bạn trên mọi thiết bị."
        to="/login"
        action="Đăng nhập"
      />
    );
  } else if (role !== 'customer') {
    content = (
      <Notice
        title="Tài khoản quản trị không có danh sách yêu thích"
        text="Hãy đăng nhập bằng tài khoản khách hàng để lưu sản phẩm."
        to="/"
        action="Về trang chủ"
      />
    );
  } else if (error && items.length === 0) {
    content = (
      <div className="site__empty" role="alert">
        <Heart className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />
        <h1>Không tải được danh sách yêu thích</h1>
        <p>{error}</p>
        <button
          type="button"
          className="site__empty-link"
          style={{ border: 0, font: 'inherit', cursor: 'pointer' }}
          onClick={() => void load()}
        >
          Thử lại
        </button>
      </div>
    );
  } else if (!loaded || (loading && items.length === 0)) {
    content = <ProductGrid title="Yêu thích" />;
  } else if (items.length === 0) {
    content = (
      <Notice
        title="Bạn chưa có sản phẩm yêu thích"
        text="Bấm vào biểu tượng trái tim ở sản phẩm để lưu lại và xem sau."
        to="/"
        action="Khám phá sản phẩm"
      />
    );
  } else {
    content = <ProductGrid title={`Yêu thích (${items.length})`} products={items} />;
  }

  return <SiteLayout crumb="Yêu thích">{content}</SiteLayout>;
}

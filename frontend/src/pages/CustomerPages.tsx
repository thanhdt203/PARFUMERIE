import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import SiteLayout from '../components/SiteLayout';
import { useAuth } from '../context/AuthContext';

// Giỏ hàng và yêu thích: hiện trạng thái trống, nối với dữ liệu thật khi có API.

export function CartPage() {
  return (
    <SiteLayout crumb="Giỏ hàng">
      <div className="site__empty">
        <ShoppingCart className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />
        <h1>Giỏ hàng của bạn đang trống</h1>
        <p>Chọn vài chai nước hoa ưng ý và thêm vào giỏ để bắt đầu.</p>
        <Link to="/" className="site__empty-link">
          Tiếp tục mua sắm
        </Link>
      </div>
    </SiteLayout>
  );
}

export function WishlistPage() {
  const { role } = useAuth();

  return (
    <SiteLayout crumb="Yêu thích">
      <div className="site__empty">
        <Heart className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />
        {role ? (
          <>
            <h1>Bạn chưa có sản phẩm yêu thích</h1>
            <p>Bấm vào biểu tượng trái tim ở sản phẩm để lưu lại và xem sau.</p>
            <Link to="/" className="site__empty-link">
              Khám phá sản phẩm
            </Link>
          </>
        ) : (
          <>
            <h1>Đăng nhập để lưu sản phẩm yêu thích</h1>
            <p>Danh sách yêu thích sẽ gắn với tài khoản của bạn trên mọi thiết bị.</p>
            <Link to="/login" className="site__empty-link">
              Đăng nhập
            </Link>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
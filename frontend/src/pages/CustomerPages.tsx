import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import SiteLayout from '../components/SiteLayout';
import { useAuth } from '../context/AuthContext';

// Yêu thích: hiện trạng thái trống, nối với dữ liệu thật khi có API.

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
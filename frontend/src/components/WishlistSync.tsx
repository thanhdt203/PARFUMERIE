import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlistStore } from '../store/wishlistStore';

// Không vẽ gì cả: đồng bộ danh sách yêu thích theo đăng nhập (để tim ở thẻ sản phẩm và số trên header luôn đúng)
export default function WishlistSync() {
  const { role, loading } = useAuth();
  const load = useWishlistStore((s) => s.load);
  const reset = useWishlistStore((s) => s.reset);

  useEffect(() => {
    if (loading) return;
    if (role === 'customer') void load();
    else reset();
  }, [role, loading, load, reset]);

  return null;
}

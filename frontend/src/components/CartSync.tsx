import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';

// Không vẽ gì cả: đồng bộ giỏ hàng theo đăng nhập (để số trên icon giỏ ở header luôn đúng)
export default function CartSync() {
  const { role, loading } = useAuth();
  const load = useCartStore((s) => s.load);
  const reset = useCartStore((s) => s.reset);

  useEffect(() => {
    if (loading) return;
    if (role === 'customer') void load();
    else reset();
  }, [role, loading, load, reset]);

  return null;
}

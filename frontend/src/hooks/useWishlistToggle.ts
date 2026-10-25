import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/errors';
import { toast } from '../store/toastStore';
import { useWishlistStore } from '../store/wishlistStore.ts';

/** Trạng thái và thao tác thích / bỏ thích một sản phẩm (dùng cho nút tim ở thẻ và trang chi tiết) */
export function useWishlistToggle(productId: string) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const liked = useWishlistStore((s) => s.ids.has(productId));
  const add = useWishlistStore((s) => s.add);
  const remove = useWishlistStore((s) => s.remove);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    if (!role) {
      navigate('/login');
      return;
    }
    if (role !== 'customer') {
      toast.info('Tài khoản quản trị không có danh sách yêu thích. Hãy đăng nhập bằng tài khoản khách hàng.');
      return;
    }
    setBusy(true);
    try {
      if (liked) await remove(productId);
      else await add(productId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { liked, busy, toggle };
}

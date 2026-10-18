import { create } from 'zustand';
import { getErrorMessage } from '../lib/errors';
import { wishlistService } from '../services/wishlistService';
import type { ProductCardData } from '../types/shop';

interface WishlistState {
  /** Mới thêm đứng đầu */
  items: ProductCardData[];
  /** Tập mã sản phẩm đã thích, để mỗi thẻ sản phẩm kiểm tra nhanh */
  ids: ReadonlySet<string>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  /** Xóa dữ liệu khi đăng xuất / đổi sang tài khoản không phải khách */
  reset: () => void;
}

const fromItems = (items: ProductCardData[]) => ({ items, ids: new Set(items.map((item) => item._id)) });

export const useWishlistStore = create<WishlistState>((set) => ({
  items: [],
  ids: new Set<string>(),
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ ...fromItems(await wishlistService.list()), loaded: true, loading: false });
    } catch (err) {
      set({ loading: false, loaded: true, error: getErrorMessage(err) });
    }
  },

  // lỗi được ném ra cho nơi gọi hiển thị (toast); trạng thái chỉ đổi khi server đã xác nhận
  add: async (productId) => {
    set({ ...fromItems(await wishlistService.add(productId)), loaded: true, error: null });
  },
  remove: async (productId) => {
    set({ ...fromItems(await wishlistService.remove(productId)), loaded: true, error: null });
  },

  reset: () => set({ items: [], ids: new Set<string>(), loaded: false, loading: false, error: null }),
}));

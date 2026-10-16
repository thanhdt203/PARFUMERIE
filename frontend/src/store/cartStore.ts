import { create } from 'zustand';
import { getErrorMessage } from '../lib/errors';
import { cartService } from '../services/cartService';
import type { CartData } from '../types/cart';

interface CartState extends CartData {
  /** Đã tải giỏ ít nhất một lần (để trang giỏ biết lúc nào hiện skeleton) */
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  /** Các hàm dưới ném lỗi để nơi gọi tự hiện thông báo */
  add: (maSPDungTich: string, soLuong: number) => Promise<void>;
  setQty: (itemId: string, soLuong: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  /** Đăng xuất / không phải khách hàng: xóa giỏ phía client */
  reset: () => void;
}

const EMPTY = { items: [], tongSoLuong: 0, tamTinh: 0, loaded: false, loading: false, error: null };

export const useCartStore = create<CartState>((set) => ({
  ...EMPTY,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const cart = await cartService.getCart();
      set({ ...cart, loaded: true, loading: false });
    } catch (err) {
      set({ loading: false, loaded: true, error: getErrorMessage(err) });
    }
  },
  add: async (maSPDungTich, soLuong) => {
    set({ ...(await cartService.addItem(maSPDungTich, soLuong)), loaded: true });
  },
  setQty: async (itemId, soLuong) => {
    set({ ...(await cartService.updateQty(itemId, soLuong)) });
  },
  remove: async (itemId) => {
    set({ ...(await cartService.removeItem(itemId)) });
  },
  reset: () => set({ ...EMPTY }),
}));

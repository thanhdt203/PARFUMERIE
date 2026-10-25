import api from '../lib/api';
import type { ProductCardData } from '../types/shop';

const BASE = '/me/wishlist';

// API yêu thích của khách (chỉ tài khoản customer). Thêm/bỏ đều trả về danh sách mới nhất.
// Lưu ý: cần VITE_USE_MOCK=false, vì mã sản phẩm mock không tồn tại trên server.
export const wishlistService = {
  async list(): Promise<ProductCardData[]> {
    const { data } = await api.get<{ data: ProductCardData[] }>(BASE);
    return data.data;
  },

  async add(productId: string): Promise<ProductCardData[]> {
    const { data } = await api.post<{ data: ProductCardData[] }>(BASE, { MaSP: productId });
    return data.data;
  },

  async remove(productId: string): Promise<ProductCardData[]> {
    const { data } = await api.delete<{ data: ProductCardData[] }>(`${BASE}/${productId}`);
    return data.data;
  },
};

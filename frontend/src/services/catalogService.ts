import api from '../lib/api';
import type { DanhMucSanPham, DungTich, ThuongHieu } from '../types/catalog';

export type CatalogKind = 'thuonghieu' | 'danhmuc' | 'dungtich';

interface ListResponse<T> {
  data: T[];
}
interface ItemResponse<T> {
  data: T;
}

async function getList<T>(kind: CatalogKind): Promise<T[]> {
  const { data } = await api.get<ListResponse<T>>(`/catalog/${kind}`);
  return data.data;
}

// Xem danh sách: API công khai /catalog/*. Thêm / sửa / xóa: /admin/catalog/* (cần đăng nhập).
export const catalogService = {
  getThuongHieu: () => getList<ThuongHieu>('thuonghieu'),
  getDanhMuc: () => getList<DanhMucSanPham>('danhmuc'),
  getDungTich: () => getList<DungTich>('dungtich'),

  async create(kind: CatalogKind, body: Record<string, unknown>): Promise<void> {
    await api.post<ItemResponse<unknown>>(`/admin/catalog/${kind}`, body);
  },

  async update(kind: CatalogKind, id: string, body: Record<string, unknown>): Promise<void> {
    await api.put<ItemResponse<unknown>>(`/admin/catalog/${kind}/${id}`, body);
  },

  /** Chỉ admin. Mục đang được dùng (có sản phẩm, có danh mục con...) sẽ bị từ chối (409). */
  async remove(kind: CatalogKind, id: string): Promise<void> {
    await api.delete(`/admin/catalog/${kind}/${id}`);
  },
};
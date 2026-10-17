import type { Id, IsoDate } from './common';
import type { Paged } from './product';

// Dạng dữ liệu API quản trị kho hàng (backend: /api/admin/inventory).
// Kho không có model riêng: mỗi dòng là một biến thể (sản phẩm + dung tích) và tồn kho là SoLuongCo của nó.

/** hethang: tồn = 0, saphet: từ 1 đến ngưỡng, conhang: lớn hơn ngưỡng */
export type StockStatus = 'hethang' | 'saphet' | 'conhang';
export type StockStatusFilter = 'all' | StockStatus;

export type StockCounts = Record<StockStatusFilter, number>;

export interface InventoryRow {
  /** _id của biến thể (SanPhamDungTich) */
  _id: Id;
  SoLuongCo: number;
  Gia: number;
  /** Ví dụ "50ml" */
  DungTich: string | null;
  TinhTrang: StockStatus;
  /** null nếu sản phẩm không còn tồn tại */
  SanPham: { _id: Id; TenSP: string; TenTH: string; DaAn: boolean; AnhChinh: string | null } | null;
  updatedAt: IsoDate;
}

export interface InventoryListResponse extends Paged<InventoryRow> {
  counts: StockCounts;
  /** Tổng số lượng tồn của các biến thể khớp từ khóa (không phụ thuộc tab) */
  tongTon: number;
  /** Ngưỡng "sắp hết" backend đã dùng */
  nguong: number;
}

export interface InventoryListParams {
  page: number;
  limit: number;
  q?: string;
  trangthai: StockStatusFilter;
  nguong: number;
}

/** Gửi đúng một trong hai: ThayDoi (cộng/trừ) hoặc SoLuongCo (đặt lại) */
export type StockAdjustInput = { ThayDoi: number } | { SoLuongCo: number };

import type { Id } from './common';

/** Một dòng trong giỏ hàng (đã gắn sẵn thông tin sản phẩm để hiển thị) */
export interface CartItem {
  /** _id của dòng giỏ (GioHang) — dùng để sửa/xóa */
  _id: Id;
  /** MaSPDungTich: biến thể (dung tích) đang chọn */
  MaSPDungTich: Id;
  MaSP: Id;
  TenSP: string;
  TenThuongHieu: string;
  GioiTinh: 'nam' | 'nu' | 'unisex';
  XuatXu: string;
  /** Ví dụ "10ml" */
  TenDungTich: string;
  AnhChinh: string | null;
  Gia: number;
  SoLuongChonMua: number;
  /** Tồn kho hiện tại của biến thể */
  SoLuongCo: number;
}

export interface CartData {
  items: CartItem[];
  tongSoLuong: number;
  tamTinh: number;
}

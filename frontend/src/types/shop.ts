import type { Id } from './common';

/** Dữ liệu một ô nước hoa ở trang khách (chỉ gồm những gì cần hiển thị) */
export interface ProductCardData {
  _id: Id;
  TenSP: string;
  TenThuongHieu: string;
  GiaThapNhat: number;
  GiaCaoNhat: number;
  /** Ảnh chính; để trống thì ô hiển thị hình chai mặc định */
  AnhChinh: string | null;
}

/** Một mục trên trang chủ (một hàng cuộn ngang) */
export interface ProductSection {
  key: string;
  title: string;
  /** Link của nút "Xem thêm" */
  to: string;
  products: ProductCardData[];
}

/** Một biến thể (dung tích) của sản phẩm ở trang chi tiết */
export interface ProductVariantView {
  /** MaSPDungTich: dùng cho giỏ hàng / đơn hàng */
  _id: Id;
  /** Ví dụ "50ml" */
  TenDungTich: string;
  Gia: number;
  SoLuongCo: number;
  ConHang: boolean;
}

/** Dữ liệu trang chi tiết sản phẩm (phía khách) */
export interface ProductDetailData {
  _id: Id;
  TenSP: string;
  MoTa: string;
  ThongTinChiTiet: string;
  XuatXu: string;
  GioiTinh: 'nam' | 'nu' | 'unisex';
  NhomHuong: string[];
  NotHuong: { Dau: string[]; Giua: string[]; Cuoi: string[] };
  ThuongHieu: { _id: Id; TenTH: string } | null;
  DanhMuc: { _id: Id; TenDM: string } | null;
  BienThe: ProductVariantView[];
  /** Đã sắp: ảnh chính đứng đầu */
  HinhAnh: Array<{ _id: Id; DuongDan: string }>;
}

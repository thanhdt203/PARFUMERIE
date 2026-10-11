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
import type { Id, IsoDate } from './common';

export interface PaymentMethod {
  _id: Id;
  TenPTTT: string;
}

/** Thông tin khách nhập ở trang thanh toán (đơn được tạo từ giỏ hàng trên server) */
export interface CreateOrderInput {
  /** Người mua */
  HoTenKH: string;
  SoDienThoaiKH: string;
  DiaChiKH: string;
  /** Người nhận (trùng người mua nếu không tick "Giao hàng đến địa chỉ khác") */
  HoTenNguoiNhan: string;
  SoDienThoaiNguoiNhan: string;
  DiaChiNguoiNhan: string;
  MaPTTT: Id;
  GhiChu: string;
  /** Mã giảm giá khách đã áp dụng (bỏ trống nếu không dùng). Backend kiểm tra lại khi tạo đơn. */
  MaCode?: string;
}

/** Kết quả kiểm tra mã giảm giá trên giỏ hàng hiện tại */
export interface VoucherPreview {
  MaCode: string;
  LoaiGiam: 'tien' | 'phantram';
  GiaTri: number;
  /** Tiền hàng của giỏ lúc kiểm tra */
  TamTinh: number;
  TienGiam: number;
  TongTien: number;
}

export interface CreatedOrder {
  _id: Id;
  TongTien: number;
  TienGiam: number;
  TrangThai: string;
}

export interface MyOrderItem {
  _id: Id;
  SoLuongMua: number;
  DonGia: number;
  ThanhTien: number;
  /** Ví dụ "10ml" */
  DungTich: string | null;
  /** null khi sản phẩm đã bị xóa khỏi cửa hàng */
  SanPham: { _id: Id; TenSP: string; TenTH: string; AnhChinh: string | null } | null;
}

export interface MyOrder {
  _id: Id;
  NgayDat: IsoDate;
  /** Tiền hàng trước khi giảm */
  TamTinh: number;
  TienGiam: number;
  Voucher: { _id: Id; MaCode: string | null } | null;
  /** Số khách phải trả (đã trừ giảm giá) */
  TongTien: number;
  TrangThai: string;
  GhiChu: string;
  HoTenNguoiNhan: string;
  SoDienThoaiNguoiNhan: string;
  DiaChiNguoiNhan: string;
  PhuongThucThanhToan: PaymentMethod | null;
  ChiTiet: MyOrderItem[];
}

export interface MyOrderListResponse {
  data: MyOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

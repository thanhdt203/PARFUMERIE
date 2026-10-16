import type { Id, IsoDate } from './common';
import type { Paged } from './product';
import type { TrangThaiDonHang } from './sales';

// Dạng dữ liệu API quản trị đơn hàng trả về / nhận vào (backend: /api/admin/orders)

export type OrderStatusFilter = 'all' | TrangThaiDonHang;

/** Số đơn theo từng trạng thái (theo từ khóa và khoảng ngày đang lọc) */
export type OrderCounts = Record<OrderStatusFilter, number>;

/** Một dòng trong danh sách đơn hàng */
export interface AdminOrderRow {
  _id: Id;
  NgayDat: IsoDate;
  TongTien: number;
  TrangThai: TrangThaiDonHang;
  HoTenKH: string;
  SoDienThoai: string;
  HoTenNguoiNhan: string;
  PhuongThucThanhToan: { _id: Id; TenPTTT: string } | null;
  /** Tổng số lượng chai của đơn */
  TongSoLuong: number;
}

export interface OrderListResponse extends Paged<AdminOrderRow> {
  counts: OrderCounts;
}

export interface AdminOrderLine {
  _id: Id;
  SoLuongMua: number;
  DonGia: number;
  ThanhTien: number;
  /** Ví dụ "50ml" */
  DungTich: string | null;
  /** null nếu sản phẩm không còn tồn tại */
  SanPham: { _id: Id; TenSP: string; TenTH: string; AnhChinh: string | null } | null;
}

export interface AdminOrderDetail {
  _id: Id;
  NgayDat: IsoDate;
  TongTien: number;
  /** Tổng tiền các dòng hàng, chưa trừ giảm giá */
  TamTinh: number;
  TrangThai: TrangThaiDonHang;
  GhiChu: string;
  HoTenKH: string;
  Email: string;
  SoDienThoai: string;
  DiaChi: string;
  HoTenNguoiNhan: string;
  SoDienThoaiNguoiNhan: string;
  DiaChiNguoiNhan: string;
  MaKH: Id;
  PhuongThucThanhToan: { _id: Id; TenPTTT: string } | null;
  /** Nhân viên xử lý, null nếu chưa ai nhận đơn */
  NhanVien: { _id: Id; HoTenNV: string } | null;
  Voucher: { _id: Id; GiaTri: number } | null;
  ChiTiet: AdminOrderLine[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface OrderFilterParams {
  q?: string;
  trangthai: OrderStatusFilter;
  /** YYYY-MM-DD */
  tu?: string;
  /** YYYY-MM-DD, gồm cả ngày này */
  den?: string;
}

export interface OrderListParams extends OrderFilterParams {
  page: number;
  limit: number;
}

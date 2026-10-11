import type { Id, IsoDate, Timestamps } from './common';

/**
 * Backend để DonHang.TrangThai là String tự do (tối đa 50). Seed hiện chỉ dùng
 * "Chờ xác nhận"; bốn giá trị còn lại là đề xuất của giao diện admin,
 * cần thống nhất với backend khi làm API đơn hàng.
 */
export const TRANG_THAI_DON_HANG = [
  'Chờ xác nhận',
  'Đang xử lý',
  'Đang giao',
  'Hoàn thành',
  'Đã hủy',
] as const;
export type TrangThaiDonHang = (typeof TRANG_THAI_DON_HANG)[number];

export interface PhuongThucThanhToan extends Timestamps {
  _id: Id;
  TenPTTT: string; // tối đa 50
}

export interface DonHang extends Timestamps {
  _id: Id;
  NgayDat: IsoDate;
  TongTien: number;
  TrangThai: TrangThaiDonHang;
  MaPTTT: Id;
  GhiChu: string; // tối đa 150
  HoTenKH: string; // tối đa 50
  Email: string; // tối đa 150
  SoDienThoai: string; // tối đa 15
  DiaChi: string; // tối đa 150
  HoTenNguoiNhan: string; // tối đa 100
  SoDienThoaiNguoiNhan: string; // tối đa 15
  DiaChiNguoiNhan: string; // tối đa 150
  /** Nhân viên xử lý. Schema backend đang để required nên đơn mới chưa ai nhận sẽ lỗi, cần backend cho phép null. */
  MaNV: Id | null;
  /** Schema backend đang để required, đơn không dùng voucher cần cho phép null. */
  MaVoucher: Id | null;
  MaKH: Id;
}

export interface ChiTietDonHang extends Timestamps {
  _id: Id;
  MaDH: Id;
  MaSPDungTich: Id;
  SoLuongMua: number;
  DonGia: number;
}

export interface Voucher extends Timestamps {
  _id: Id;
  GiaTri: number;
  NgayBatDau: IsoDate;
  NgayKetThuc: IsoDate;
}

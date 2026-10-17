import type { Id, IsoDate, Timestamps } from './common';
import type { Paged } from './product';

// Dạng dữ liệu API quản trị voucher trả về / nhận vào (backend: /api/admin/vouchers)

/** tien: giảm số tiền cố định (VND), phantram: giảm theo % */
export type LoaiGiam = 'tien' | 'phantram';

/** Tình trạng do backend tính theo ngày, bật/tắt và số lượt đã dùng */
export type VoucherStatus = 'hoatdong' | 'saptoi' | 'hethan' | 'hetluot' | 'tat';
export type VoucherStatusFilter = 'all' | VoucherStatus;

/** Số voucher theo từng tình trạng (theo từ khóa đang tìm) */
export type VoucherCounts = Record<VoucherStatusFilter, number>;

export interface AdminVoucher extends Timestamps {
  _id: Id;
  /** null với voucher tạo từ bản cũ chưa có mã */
  MaCode: string | null;
  LoaiGiam: LoaiGiam;
  /** LoaiGiam = tien: số tiền (VND). LoaiGiam = phantram: số % (1-100) */
  GiaTri: number;
  /** Chỉ có ý nghĩa khi giảm theo %, null = không giới hạn */
  GiamToiDa: number | null;
  /** Tổng tiền hàng tối thiểu, 0 = không yêu cầu */
  DonToiThieu: number;
  /** Tổng số lượt được dùng, null = không giới hạn */
  SoLuong: number | null;
  DangBat: boolean;
  NgayBatDau: IsoDate;
  NgayKetThuc: IsoDate;
  /** Số đơn chưa hủy đã dùng voucher (tính vào SoLuong) */
  DaDung: number;
  /** Số đơn gắn voucher kể cả đã hủy. > 0 thì không đổi được mã / mức giảm và không xóa được */
  SoDon: number;
  TinhTrang: VoucherStatus;
}

export interface VoucherListResponse extends Paged<AdminVoucher> {
  counts: VoucherCounts;
}

/** Body thêm / sửa. Ngày dạng YYYY-MM-DD theo giờ Việt Nam. */
export interface VoucherInput {
  MaCode: string;
  LoaiGiam: LoaiGiam;
  GiaTri: number;
  GiamToiDa: number | null;
  DonToiThieu: number;
  SoLuong: number | null;
  DangBat: boolean;
  NgayBatDau: string;
  NgayKetThuc: string;
}

export interface VoucherListParams {
  page: number;
  limit: number;
  q?: string;
  trangthai: VoucherStatusFilter;
}

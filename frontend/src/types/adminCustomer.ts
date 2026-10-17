import type { Id, IsoDate, Timestamps } from './common';
import type { Paged } from './product';

// Dạng dữ liệu API quản trị khách hàng trả về (backend: /api/admin/customers). Chỉ xem, không sửa.

/** moi: mới đăng ký trước | chitieu: chi tiêu cao nhất trước | sodon: nhiều đơn nhất trước */
export type CustomerSort = 'moi' | 'chitieu' | 'sodon';

export interface AdminCustomerRow extends Timestamps {
  _id: Id;
  Ho: string;
  Ten: string;
  Email: string;
  SoDienThoai: string;
  /** Số đơn chưa hủy */
  SoDon: number;
  /** Tổng tiền các đơn chưa hủy (VND) */
  TongChiTieu: number;
  /** null nếu chưa mua lần nào */
  LanMuaCuoi: IsoDate | null;
}

export interface CustomerSummary {
  TongKhach: number;
  /** Khách đăng ký trong 30 ngày qua */
  MoiTrong30Ngay: number;
  /** Khách có ít nhất một đơn chưa hủy */
  DaMuaHang: number;
}

export interface CustomerListResponse extends Paged<AdminCustomerRow> {
  summary: CustomerSummary;
}

export interface CustomerRecentOrder {
  _id: Id;
  NgayDat: IsoDate;
  TongTien: number;
  TrangThai: string;
}

export interface AdminCustomerDetail extends Timestamps {
  _id: Id;
  Ho: string;
  Ten: string;
  Email: string;
  SoDienThoai: string;
  SoDon: number;
  SoDonHoanThanh: number;
  SoDonHuy: number;
  TongChiTieu: number;
  LanMuaCuoi: IsoDate | null;
  /** Tối đa 10 đơn mới nhất, kể cả đơn đã hủy */
  DonGanDay: CustomerRecentOrder[];
}

export interface CustomerListParams {
  page: number;
  limit: number;
  q: string;
  sapxep: CustomerSort;
}

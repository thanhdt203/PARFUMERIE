import type { Id, IsoDate } from './common';
import type { TrangThaiDonHang } from './sales';

export const DASHBOARD_RANGES = ['7d', '30d', '3m', '12m'] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

/** Cách gom nhóm biểu đồ: ngày (7d, 30d), tuần (3m), tháng (12m) */
export type Granularity = 'ngay' | 'tuan' | 'thang';

/** Giá trị trong kỳ và giá trị của kỳ liền trước (cùng độ dài) để tính % tăng giảm */
export interface MetricValue {
  value: number;
  previous: number;
}

export interface RevenuePoint {
  /** Nhãn ngắn trên trục X: dd/MM hoặc MM/yyyy */
  label: string;
  doanhThu: number;
  soDon: number;
}

export interface TopProduct {
  maSP: Id;
  tenSP: string;
  tenTH: string;
  soLuongBan: number;
  doanhThu: number;
}

export interface RecentOrder {
  _id: Id;
  HoTenKH: string;
  NgayDat: IsoDate;
  TongTien: number;
  TrangThai: TrangThaiDonHang;
}

export interface LowStockSummary {
  soSanPham: number;
  soBienThe: number;
  nguong: number;
}

/** Dữ liệu một lần tải Dashboard. API thật /admin/dashboard cũng trả đúng dạng này. */
export interface DashboardData {
  range: DashboardRange;
  granularity: Granularity;
  /** Doanh thu và số đơn không tính đơn đã hủy */
  doanhThu: MetricValue;
  soDon: MetricValue;
  khachHangMoi: MetricValue;
  tongKhachHang: number;
  sapHetHang: LowStockSummary;
  doanhThuTheoThoiGian: RevenuePoint[];
  donGanDay: RecentOrder[];
  topSanPham: TopProduct[];
}

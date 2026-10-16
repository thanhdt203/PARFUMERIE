import type { StatusTone } from '../components/common/StatusBadge';
import type { TrangThaiDonHang } from '../types/sales';

const ORDER_STATUS_TONE: Record<TrangThaiDonHang, StatusTone> = {
  'Chờ xác nhận': 'warning',
  'Đang xử lý': 'info',
  'Đang giao': 'info',
  'Hoàn thành': 'success',
  'Đã hủy': 'danger',
};

/** Backend cho phép chuỗi bất kỳ, trạng thái lạ hiện màu trung tính */
export function getOrderStatusTone(status: string): StatusTone {
  const known: Record<string, StatusTone> = ORDER_STATUS_TONE;
  return known[status] ?? 'neutral';
}

/**
 * Trạng thái hiện tại -> các trạng thái được phép chuyển tới.
 * Giữ khớp với CHUYEN_TRANG_THAI trong backend/src/controllers/adminOrderController.js
 */
const NEXT_STATUSES: Record<TrangThaiDonHang, readonly TrangThaiDonHang[]> = {
  'Chờ xác nhận': ['Đang xử lý', 'Đã hủy'],
  'Đang xử lý': ['Đang giao', 'Đã hủy'],
  'Đang giao': ['Hoàn thành', 'Đã hủy'],
  'Hoàn thành': [],
  'Đã hủy': [],
};

export function getNextStatuses(status: string): readonly TrangThaiDonHang[] {
  const known: Record<string, readonly TrangThaiDonHang[]> = NEXT_STATUSES;
  return known[status] ?? [];
}

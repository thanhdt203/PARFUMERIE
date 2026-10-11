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

import type { StatusTone } from '../components/common/StatusBadge';
import type { AdminVoucher, VoucherStatus } from '../types/voucher.ts';
import { formatVnd } from './format';

export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  hoatdong: 'Đang hoạt động',
  saptoi: 'Sắp diễn ra',
  hethan: 'Hết hạn',
  hetluot: 'Hết lượt',
  tat: 'Đã tắt',
};

export const VOUCHER_STATUS_TONE: Record<VoucherStatus, StatusTone> = {
  hoatdong: 'success',
  saptoi: 'info',
  hethan: 'neutral',
  hetluot: 'warning',
  tat: 'danger',
};

/** "100.000 ₫" hoặc "10%" */
export function formatDiscount(v: Pick<AdminVoucher, 'LoaiGiam' | 'GiaTri'>): string {
  return v.LoaiGiam === 'phantram' ? `${v.GiaTri}%` : formatVnd(v.GiaTri);
}

// Backend hiểu ngày theo giờ Việt Nam, nên đổi ngày cũng theo giờ Việt Nam
// (không phụ thuộc múi giờ của máy đang mở trang). en-CA cho ra dạng YYYY-MM-DD.
const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** ISO -> "YYYY-MM-DD" (giờ Việt Nam), dùng cho <input type="date"> */
export function toDateInput(iso: string): string {
  return vnDateFormatter.format(new Date(iso));
}

/** ISO -> "dd/MM/yyyy" (giờ Việt Nam) */
export function formatVnDate(iso: string): string {
  const [y, m, d] = toDateInput(iso).split('-');
  return `${d}/${m}/${y}`;
}

/** Hôm nay dạng YYYY-MM-DD (giờ Việt Nam) */
export function todayInput(): string {
  return vnDateFormatter.format(new Date());
}

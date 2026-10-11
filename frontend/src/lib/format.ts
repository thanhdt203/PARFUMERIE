const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('vi-VN');

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 1234000 -> "1.234.000 ₫" */
export function formatVnd(value: number): string {
  return vndFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Rút gọn cho trục biểu đồ: 1500000 -> "1,5 tr", 2500000000 -> "2,5 tỷ" */
export function formatCompactVnd(value: number): string {
  const abs = Math.abs(value);
  const short = (n: number, unit: string) =>
    `${numberFormatter.format(Math.round(n * 10) / 10)} ${unit}`;
  if (abs >= 1e9) return short(value / 1e9, 'tỷ');
  if (abs >= 1e6) return short(value / 1e6, 'tr');
  if (abs >= 1e3) return short(value / 1e3, 'k');
  return numberFormatter.format(value);
}

/** 0.125 -> "+12,5%", -0.03 -> "-3%" */
export function formatPercent(fraction: number): string {
  const percent = Math.round(fraction * 1000) / 10;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${numberFormatter.format(percent)}%`;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** dd/MM/yyyy */
export function formatDate(value: string | Date): string {
  const d = toDate(value);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** dd/MM/yyyy HH:mm */
export function formatDateTime(value: string | Date): string {
  const d = toDate(value);
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** HH:mm */
export function formatTime(value: string | Date): string {
  const d = toDate(value);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Mã hiển thị của đơn: 6 ký tự cuối của _id, ví dụ "#DH0042" */
export function formatOrderCode(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

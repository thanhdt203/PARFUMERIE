import type { DashboardRange, Granularity } from '../types/dashboard';

/** Khoảng thời gian dạng nửa mở [start, end) */
export interface RangeBounds {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  granularity: Granularity;
}

export interface DateBucket {
  start: Date;
  end: Date;
  label: string;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

/**
 * Quy ước bộ lọc Dashboard:
 *  7 ngày / 30 ngày: N ngày gần nhất, gồm hôm nay, gom theo ngày.
 *  3 tháng: 91 ngày (đúng 13 tuần) để chia tuần không bị lẻ, gom theo tuần.
 *  12 tháng: từ đầu tháng của 11 tháng trước đến hôm nay, gom theo tháng.
 * Kỳ trước có cùng độ dài, liền ngay trước kỳ hiện tại.
 */
export function getRangeBounds(range: DashboardRange, now: Date = new Date()): RangeBounds {
  const today = startOfDay(now);
  const end = addDays(today, 1);

  if (range === '12m') {
    const start = addMonths(startOfMonth(today), -11);
    return { start, end, prevStart: addMonths(start, -12), prevEnd: start, granularity: 'thang' };
  }

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 91;
  const start = addDays(end, -days);
  return {
    start,
    end,
    prevStart: addDays(start, -days),
    prevEnd: start,
    granularity: range === '3m' ? 'tuan' : 'ngay',
  };
}

/** Chia kỳ thành các nhóm theo granularity để vẽ biểu đồ */
export function buildBuckets(bounds: RangeBounds): DateBucket[] {
  const { start, end, granularity } = bounds;
  const buckets: DateBucket[] = [];

  if (granularity === 'thang') {
    for (let m = start; m < end; m = addMonths(m, 1)) {
      buckets.push({
        start: m,
        end: addMonths(m, 1),
        label: `${pad2(m.getMonth() + 1)}/${m.getFullYear()}`,
      });
    }
    return buckets;
  }

  const step = granularity === 'tuan' ? 7 : 1;
  for (let d = start; d < end; d = addDays(d, step)) {
    buckets.push({
      start: d,
      end: addDays(d, step),
      label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
    });
  }
  return buckets;
}

export function isInRange(time: number, start: Date, end: Date): boolean {
  return time >= start.getTime() && time < end.getTime();
}

import { cn } from '../../lib/cn';
import { formatCompactVnd, formatNumber } from '../../lib/format';
import type { TopProduct } from '../../types/dashboard';
import EmptyState from '../common/EmptyState';
import Skeleton from '../common/Skeleton';

interface TopProductsProps {
  items: TopProduct[];
  refreshing?: boolean;
  className?: string;
}

export default function TopProducts({ items, refreshing = false, className }: TopProductsProps) {
  const maxSold = Math.max(1, ...items.map((item) => item.soLuongBan));

  return (
    <section
      aria-label="Sản phẩm bán chạy"
      className={cn('rounded-card border border-line bg-surface p-5 shadow-card', className)}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-ink">Bán chạy nhất</h3>
        <p className="text-sm text-ink-muted">Theo số lượng bán trong kỳ</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Chưa có sản phẩm bán ra" description="Không có đơn hàng nào trong khoảng thời gian này." />
      ) : (
        <ol className={cn('space-y-4 transition-opacity', refreshing && 'opacity-50')}>
          {items.map((item, index) => (
            <li key={item.maSP} className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink">{item.tenSP}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatNumber(item.soLuongBan)}</p>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-ink-muted">
                  <p className="truncate">{item.tenTH}</p>
                  <p className="shrink-0 tabular-nums">{formatCompactVnd(item.doanhThu)}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.round((item.soLuongBan / maxSold) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function TopProductsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn('rounded-card border border-line bg-surface p-5 shadow-card', className)}>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </section>
  );
}

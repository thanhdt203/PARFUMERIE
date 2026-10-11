import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatPercent } from '../../lib/format';
import Skeleton from './Skeleton';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: 'accent' | 'warning';
  /** Phần trăm thay đổi dạng số thập phân (0.125 = +12,5%). null = kỳ trước chưa có dữ liệu. Bỏ trống = không hiện. */
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  /** Có `to` thì cả thẻ là liên kết */
  to?: string;
  loading?: boolean;
}

const CARD_CLASS = 'block rounded-card border border-line bg-surface p-5 shadow-card';

function Delta({ delta, label }: { delta: number | null; label: string }) {
  if (delta === null) {
    return <p className="text-xs text-ink-faint">Chưa có dữ liệu kỳ trước</p>;
  }
  const up = delta > 0;
  const down = delta < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs">
      <span
        className={cn(
          'inline-flex items-center gap-1 font-medium',
          up && 'text-success',
          down && 'text-danger',
          !up && !down && 'text-ink-muted',
        )}
      >
        {(up || down) && <Icon className="size-3.5" aria-hidden="true" />}
        {formatPercent(delta)}
      </span>
      <span className="text-ink-muted">{label}</span>
    </p>
  );
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  tone = 'accent',
  delta,
  deltaLabel = 'so với kỳ trước',
  hint,
  to,
  loading = false,
}: StatCardProps) {
  const body = loading ? (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-32" />
    </div>
  ) : (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm text-ink-muted">{title}</p>
        <p className="truncate text-2xl font-bold tabular-nums text-ink">{value}</p>
        {delta !== undefined && <Delta delta={delta} label={deltaLabel} />}
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-control',
          tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-accent',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </div>
  );

  if (to && !loading) {
    return (
      <Link to={to} className={cn(CARD_CLASS, 'transition-colors hover:border-accent')}>
        {body}
      </Link>
    );
  }
  return <div className={CARD_CLASS}>{body}</div>;
}

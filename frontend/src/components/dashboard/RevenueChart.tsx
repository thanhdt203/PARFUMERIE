import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '../../lib/cn';
import { formatCompactVnd, formatNumber, formatVnd } from '../../lib/format';
import type { Granularity, RevenuePoint } from '../../types/dashboard';
import EmptyState from '../common/EmptyState';
import Skeleton from '../common/Skeleton';

const GRANULARITY_LABEL: Record<Granularity, { prefix: string; text: string }> = {
  ngay: { prefix: 'Ngày', text: 'theo ngày' },
  tuan: { prefix: 'Tuần từ', text: 'theo tuần' },
  thang: { prefix: 'Tháng', text: 'theo tháng' },
};

function isRevenuePoint(value: unknown): value is RevenuePoint {
  return typeof value === 'object' && value !== null && 'doanhThu' in value && 'label' in value;
}

interface ChartTooltipProps {
  // Recharts tự truyền các props này vào phần tử đặt ở `content`
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  granularity: Granularity;
}

function ChartTooltip({ active, payload, granularity }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (!isRevenuePoint(point)) return null;
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm shadow-pop">
      <p className="text-ink-muted">
        {GRANULARITY_LABEL[granularity].prefix} {point.label}
      </p>
      <p className="font-semibold text-ink">{formatVnd(point.doanhThu)}</p>
      <p className="text-ink-muted">{formatNumber(point.soDon)} đơn</p>
    </div>
  );
}

interface RevenueChartProps {
  points: RevenuePoint[];
  granularity: Granularity;
  total: number;
  /** Đang tải lại: làm mờ biểu đồ cũ */
  refreshing?: boolean;
  className?: string;
}

export default function RevenueChart({ points, granularity, total, refreshing = false, className }: RevenueChartProps) {
  const hasRevenue = points.some((point) => point.doanhThu > 0);

  return (
    <section
      aria-label="Biểu đồ doanh thu"
      className={cn('rounded-card border border-line bg-surface p-5 shadow-card', className)}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-ink">Doanh thu</h3>
        <p className="text-sm text-ink-muted">
          {formatVnd(total)} · {GRANULARITY_LABEL[granularity].text}
        </p>
      </div>

      {hasRevenue ? (
        <div
          role="img"
          aria-label={`Biểu đồ doanh thu ${GRANULARITY_LABEL[granularity].text}, tổng ${formatVnd(total)}`}
          className={cn('h-72 w-full transition-opacity', refreshing && 'opacity-50')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--adm-line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--adm-ink-muted)', fontSize: 12 }}
                minTickGap={16}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fill: 'var(--adm-ink-muted)', fontSize: 12 }}
                tickFormatter={(value: number) => formatCompactVnd(value)}
              />
              <Tooltip
                content={<ChartTooltip granularity={granularity} />}
                cursor={{ stroke: 'var(--adm-line)' }}
              />
              <Area
                type="monotone"
                dataKey="doanhThu"
                stroke="var(--adm-accent)"
                strokeWidth={2}
                fill="var(--adm-accent)"
                fillOpacity={0.12}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title="Chưa có doanh thu" description="Không có đơn hàng nào trong khoảng thời gian này." />
      )}
    </section>
  );
}

export function RevenueChartSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn('rounded-card border border-line bg-surface p-5 shadow-card', className)}>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-6 h-64 w-full" />
    </section>
  );
}

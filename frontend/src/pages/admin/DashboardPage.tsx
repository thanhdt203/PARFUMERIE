import { useCallback, useEffect, useState } from 'react';
import { Banknote, Package, RefreshCw, ShoppingBag, Users } from 'lucide-react';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import SegmentedControl from '../../components/common/SegmentedControl';
import StatCard from '../../components/common/StatCard';
import RecentOrders from '../../components/dashboard/RecentOrders';
import RevenueChart, { RevenueChartSkeleton } from '../../components/dashboard/RevenueChart';
import TopProducts, { TopProductsSkeleton } from '../../components/dashboard/TopProducts';
import { useAsyncData } from '../../hooks/useAsyncData';
import { formatNumber, formatTime, formatVnd } from '../../lib/format';
import { dashboardService } from '../../services/dashboardService';
import { toast } from '../../store/toastStore';
import type { DashboardRange, MetricValue } from '../../types/dashboard';

const RANGE_OPTIONS: ReadonlyArray<{ value: DashboardRange; label: string }> = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '3m', label: '3 tháng' },
  { value: '12m', label: '12 tháng' },
];

const RANGE_TEXT: Record<DashboardRange, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '3m': '3 tháng',
  '12m': '12 tháng',
};

/** % thay đổi so với kỳ trước. null khi kỳ trước bằng 0 (không chia được). */
function getDelta({ value, previous }: MetricValue): number | null {
  return previous === 0 ? null : (value - previous) / previous;
}

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('30d');
  const load = useCallback(() => dashboardService.getDashboard(range), [range]);
  const { data, loading, error, updatedAt, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên màn hình và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const firstLoad = loading && !data;
  const refreshing = loading && Boolean(data);
  const rangeText = RANGE_TEXT[range];
  const previousLabel = `so với ${rangeText} trước`;

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          <>
            Tổng quan {rangeText} gần nhất
            {updatedAt && <span className="text-ink-faint"> · cập nhật lúc {formatTime(updatedAt)}</span>}
          </>
        }
        actions={
          <>
            <SegmentedControl
              ariaLabel="Khoảng thời gian"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
            />
            <Button icon={RefreshCw} onClick={reload} loading={refreshing} aria-label="Làm mới dữ liệu" />
          </>
        }
      />

      {error && !data ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          <section aria-label="Thống kê nhanh" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Doanh thu"
              icon={Banknote}
              loading={firstLoad}
              value={data ? formatVnd(data.doanhThu.value) : ''}
              delta={data ? getDelta(data.doanhThu) : undefined}
              deltaLabel={previousLabel}
            />
            <StatCard
              title="Đơn hàng"
              icon={ShoppingBag}
              loading={firstLoad}
              value={data ? formatNumber(data.soDon.value) : ''}
              delta={data ? getDelta(data.soDon) : undefined}
              deltaLabel={previousLabel}
              hint="Không tính đơn đã hủy"
            />
            <StatCard
              title="Khách hàng"
              icon={Users}
              loading={firstLoad}
              value={data ? formatNumber(data.tongKhachHang) : ''}
              hint={data ? `${formatNumber(data.khachHangMoi.value)} khách mới trong ${rangeText}` : undefined}
              to="/admin/khach-hang"
            />
            <StatCard
              title="Sản phẩm sắp hết hàng"
              icon={Package}
              tone="warning"
              loading={firstLoad}
              value={data ? formatNumber(data.sapHetHang.soSanPham) : ''}
              hint={
                data
                  ? `${formatNumber(data.sapHetHang.soBienThe)} biến thể còn từ ${data.sapHetHang.nguong} chai trở xuống`
                  : undefined
              }
              to="/admin/kho"
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            {data ? (
              <>
                <RevenueChart
                  className="xl:col-span-2"
                  points={data.doanhThuTheoThoiGian}
                  granularity={data.granularity}
                  total={data.doanhThu.value}
                  refreshing={refreshing}
                />
                <TopProducts items={data.topSanPham} refreshing={refreshing} />
              </>
            ) : (
              <>
                <RevenueChartSkeleton className="xl:col-span-2" />
                <TopProductsSkeleton />
              </>
            )}
          </div>

          <RecentOrders orders={data?.donGanDay ?? []} loading={firstLoad} />
        </>
      )}
    </div>
  );
}

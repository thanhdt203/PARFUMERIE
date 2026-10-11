import { Link } from 'react-router-dom';
import { formatDateTime, formatOrderCode, formatVnd } from '../../lib/format';
import { getOrderStatusTone } from '../../lib/orderStatus';
import type { RecentOrder } from '../../types/dashboard';
import DataTable from '../common/DataTable';
import type { DataTableColumn } from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';

const COLUMNS: ReadonlyArray<DataTableColumn<RecentOrder>> = [
  {
    key: 'ma',
    header: 'Mã đơn',
    render: (order) => <span className="font-medium tabular-nums">{formatOrderCode(order._id)}</span>,
  },
  { key: 'khach', header: 'Khách hàng', render: (order) => order.HoTenKH },
  {
    key: 'ngay',
    header: 'Ngày đặt',
    hideBelow: 'md',
    render: (order) => <span className="tabular-nums text-ink-muted">{formatDateTime(order.NgayDat)}</span>,
  },
  {
    key: 'tien',
    header: 'Tổng tiền',
    align: 'right',
    render: (order) => <span className="font-medium tabular-nums">{formatVnd(order.TongTien)}</span>,
  },
  {
    key: 'trangThai',
    header: 'Trạng thái',
    render: (order) => <StatusBadge tone={getOrderStatusTone(order.TrangThai)}>{order.TrangThai}</StatusBadge>,
  },
];

interface RecentOrdersProps {
  orders: RecentOrder[];
  loading?: boolean;
}

export default function RecentOrders({ orders, loading = false }: RecentOrdersProps) {
  return (
    <section aria-label="Đơn hàng gần đây" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">Đơn hàng gần đây</h3>
        <Link to="/admin/don-hang" className="text-sm font-medium text-accent hover:underline">
          Xem tất cả
        </Link>
      </div>
      <DataTable
        caption="Đơn hàng gần đây"
        columns={COLUMNS}
        rows={orders}
        rowKey={(order) => order._id}
        loading={loading}
        skeletonRows={6}
        emptyTitle="Chưa có đơn hàng"
        emptyDescription="Đơn hàng mới sẽ xuất hiện ở đây."
      />
    </section>
  );
}

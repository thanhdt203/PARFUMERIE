import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Search } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import { TextInput } from '../../components/common/FormField';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import SegmentedControl from '../../components/common/SegmentedControl';
import StatusBadge from '../../components/common/StatusBadge';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getErrorMessage } from '../../lib/errors';
import { formatDateTime, formatNumber, formatOrderCode, formatVnd } from '../../lib/format';
import { getOrderStatusTone } from '../../lib/orderStatus';
import { orderService } from '../../services/orderService';
import { toast } from '../../store/toastStore';
import type { AdminOrderRow, OrderStatusFilter } from '../../types/order';
import { TRANG_THAI_DON_HANG } from '../../types/sales';

const PAGE_SIZES = [12, 24, 48] as const;

const STATUS_FILTERS: ReadonlyArray<{ value: OrderStatusFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  ...TRANG_THAI_DON_HANG.map((status) => ({ value: status, label: status })),
];

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState<OrderStatusFilter>('all');
  const [tu, setTu] = useState('');
  const [den, setDen] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const debouncedSearch = useDebouncedValue(search.trim());

  const load = useCallback(
    () => orderService.list({ page, limit: pageSize, q: debouncedSearch, trangthai: trangThai, tu, den }),
    [page, pageSize, debouncedSearch, trangThai, tu, den],
  );
  const { data, loading, error, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên bảng và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const counts = data?.counts;
  const filtering = debouncedSearch !== '' || trangThai !== 'all' || tu !== '' || den !== '';
  const dateRangeInvalid = tu !== '' && den !== '' && tu > den;

  // Gắn số đơn vào nhãn từng tab khi đã có dữ liệu
  const statusOptions = STATUS_FILTERS.map((option) => ({
    value: option.value,
    label: counts ? `${option.label} (${formatNumber(counts[option.value])})` : option.label,
  }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      await orderService.exportCsv({ q: debouncedSearch, trangthai: trangThai, tu, den });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const columns: ReadonlyArray<DataTableColumn<AdminOrderRow>> = [
    {
      key: 'code',
      header: 'Mã đơn',
      className: 'whitespace-nowrap font-medium',
      render: (row) => formatOrderCode(row._id),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{row.HoTenKH}</p>
          <p className="text-xs text-ink-muted">{row.SoDienThoai}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Ngày đặt',
      hideBelow: 'md',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => formatDateTime(row.NgayDat),
    },
    {
      key: 'payment',
      header: 'Thanh toán',
      hideBelow: 'lg',
      render: (row) => row.PhuongThucThanhToan?.TenPTTT ?? '—',
    },
    {
      key: 'quantity',
      header: 'SL',
      align: 'right',
      hideBelow: 'lg',
      className: 'tabular-nums',
      render: (row) => formatNumber(row.TongSoLuong),
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      align: 'right',
      hideBelow: 'sm',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => formatVnd(row.TongTien),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge tone={getOrderStatusTone(row.TrangThai)}>{row.TrangThai}</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Eye}
          aria-label={`Xem đơn ${formatOrderCode(row._id)}`}
          title="Xem chi tiết"
          onClick={(event) => {
            event.stopPropagation();
            setOpenId(row._id);
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        description="Tra cứu đơn hàng, xem chi tiết và cập nhật trạng thái xử lý."
        actions={
          <Button icon={Download} loading={exporting} disabled={total === 0} onClick={exportCsv}>
            Xuất CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <TextInput
            aria-label="Tìm đơn hàng"
            placeholder="Tìm theo mã đơn, tên, số điện thoại, email"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Từ ngày
            <TextInput
              type="date"
              className="w-auto"
              max={den || undefined}
              value={tu}
              onChange={(event) => {
                setTu(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Đến ngày
            <TextInput
              type="date"
              className="w-auto"
              min={tu || undefined}
              value={den}
              onChange={(event) => {
                setDen(event.target.value);
                setPage(1);
              }}
            />
          </label>
          {(tu || den) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTu('');
                setDen('');
                setPage(1);
              }}
            >
              Xóa lọc ngày
            </Button>
          )}
        </div>
      </div>

      {dateRangeInvalid && (
        <p role="alert" className="text-sm text-danger">
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </p>
      )}

      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          ariaLabel="Lọc theo trạng thái đơn hàng"
          options={statusOptions}
          value={trangThai}
          onChange={(value) => {
            setTrangThai(value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Danh sách đơn hàng"
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(row) => setOpenId(row._id)}
        emptyTitle={filtering ? 'Không có đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
        emptyDescription={
          filtering ? 'Thử đổi từ khóa, trạng thái hoặc khoảng ngày.' : 'Đơn hàng khách đặt sẽ hiện ở đây.'
        }
        footer={
          total > 0 ? (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZES}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      />

      {openId && <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Eye, Search, ShoppingBag, UserPlus, Users } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import { TextInput } from '../../components/common/FormField';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import SegmentedControl from '../../components/common/SegmentedControl';
import StatCard from '../../components/common/StatCard';
import CustomerDetailModal from '../../components/customers/CustomerDetailModal';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatDate, formatNumber, formatVnd } from '../../lib/format';
import { adminCustomerService } from '../../services/adminCustomerService';
import { toast } from '../../store/toastStore';
import type { AdminCustomerRow, CustomerSort } from '../../types/adminCustomer';

const PAGE_SIZES = [12, 24, 48] as const;

const SORT_OPTIONS: ReadonlyArray<{ value: CustomerSort; label: string }> = [
  { value: 'moi', label: 'Mới đăng ký' },
  { value: 'chitieu', label: 'Chi tiêu cao nhất' },
  { value: 'sodon', label: 'Nhiều đơn nhất' },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [sapXep, setSapXep] = useState<CustomerSort>('moi');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const debouncedSearch = useDebouncedValue(search.trim());

  const load = useCallback(
    () => adminCustomerService.list({ page, limit: pageSize, q: debouncedSearch, sapxep: sapXep }),
    [page, pageSize, debouncedSearch, sapXep],
  );
  const { data, loading, error, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên bảng và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const summary = data?.summary;

  const columns: ReadonlyArray<DataTableColumn<AdminCustomerRow>> = [
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{`${row.Ho} ${row.Ten}`}</p>
          <p className="truncate text-xs text-ink-muted">{row.Email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      hideBelow: 'md',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => row.SoDienThoai,
    },
    {
      key: 'joined',
      header: 'Đăng ký',
      hideBelow: 'lg',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'orders',
      header: 'Số đơn',
      align: 'right',
      hideBelow: 'sm',
      className: 'tabular-nums',
      render: (row) => formatNumber(row.SoDon),
    },
    {
      key: 'spent',
      header: 'Tổng chi tiêu',
      align: 'right',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => formatVnd(row.TongChiTieu),
    },
    {
      key: 'last',
      header: 'Mua gần nhất',
      hideBelow: 'lg',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => (row.LanMuaCuoi ? formatDate(row.LanMuaCuoi) : <span className="text-ink-faint">Chưa mua</span>),
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
          aria-label={`Xem khách hàng ${row.Ho} ${row.Ten}`}
          title="Xem chi tiết"
          onClick={(event) => {
            event.stopPropagation();
            setOpenCustomerId(row._id);
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader description="Tra cứu khách hàng, xem lịch sử mua hàng và tổng chi tiêu (không tính đơn đã hủy)." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng khách hàng"
          value={summary ? formatNumber(summary.TongKhach) : '—'}
          icon={Users}
          loading={!summary && loading}
        />
        <StatCard
          title="Đăng ký 30 ngày qua"
          value={summary ? formatNumber(summary.MoiTrong30Ngay) : '—'}
          icon={UserPlus}
          loading={!summary && loading}
        />
        <StatCard
          title="Đã từng mua hàng"
          value={summary ? formatNumber(summary.DaMuaHang) : '—'}
          icon={ShoppingBag}
          loading={!summary && loading}
        />
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <TextInput
          aria-label="Tìm khách hàng"
          placeholder="Tìm theo tên, email, số điện thoại"
          className="pl-9"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          ariaLabel="Sắp xếp khách hàng"
          options={SORT_OPTIONS}
          value={sapXep}
          onChange={(value) => {
            setSapXep(value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Danh sách khách hàng"
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(row) => setOpenCustomerId(row._id)}
        emptyTitle={debouncedSearch ? 'Không có khách hàng phù hợp' : 'Chưa có khách hàng nào'}
        emptyDescription={debouncedSearch ? 'Thử đổi từ khóa tìm kiếm.' : 'Khách hàng sẽ xuất hiện ở đây sau khi đăng ký tài khoản.'}
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

      {openCustomerId && (
        <CustomerDetailModal
          customerId={openCustomerId}
          onClose={() => setOpenCustomerId(null)}
          onOpenOrder={(orderId) => {
            setOpenCustomerId(null);
            setOpenOrderId(orderId);
          }}
        />
      )}

      {openOrderId && (
        <OrderDetailModal
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
          onChanged={reload} // đổi trạng thái / hủy đơn làm đổi số đơn và chi tiêu của khách
        />
      )}
    </div>
  );
}

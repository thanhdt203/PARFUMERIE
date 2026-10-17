import { useCallback, useEffect, useState } from 'react';
import { Package, PackagePlus, Search } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import { TextInput } from '../../components/common/FormField';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import SegmentedControl from '../../components/common/SegmentedControl';
import StatusBadge from '../../components/common/StatusBadge';
import StockAdjustModal from '../../components/inventory/StockAdjustModal';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatNumber, formatVnd } from '../../lib/format';
import { DEFAULT_LOW_STOCK, STOCK_STATUS_LABEL, STOCK_STATUS_TONE } from '../../lib/inventory';
import { inventoryService } from '../../services/inventoryService';
import { toast } from '../../store/toastStore';
import type { InventoryRow, StockStatusFilter } from '../../types/inventory';

const PAGE_SIZES = [20, 50, 100] as const;

const STATUS_FILTERS: ReadonlyArray<{ value: StockStatusFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hethang', label: STOCK_STATUS_LABEL.hethang },
  { value: 'saphet', label: STOCK_STATUS_LABEL.saphet },
  { value: 'conhang', label: STOCK_STATUS_LABEL.conhang },
];

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState<StockStatusFilter>('all');
  const [nguongText, setNguongText] = useState(String(DEFAULT_LOW_STOCK));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedNguong = useDebouncedValue(nguongText);

  // ô ngưỡng bỏ trống hoặc ngoài 1-1000 thì tạm dùng mặc định, tránh gọi API với giá trị sai
  const parsed = Number(debouncedNguong);
  const nguong = Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : DEFAULT_LOW_STOCK;
  const nguongInvalid = nguongText !== '' && !(Number(nguongText) >= 1 && Number(nguongText) <= 1000);

  const load = useCallback(
    () => inventoryService.list({ page, limit: pageSize, q: debouncedSearch, trangthai: trangThai, nguong }),
    [page, pageSize, debouncedSearch, trangThai, nguong],
  );
  const { data, loading, error, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên bảng và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const counts = data?.counts;
  const filtering = debouncedSearch !== '' || trangThai !== 'all';

  // Gắn số biến thể vào nhãn từng tab khi đã có dữ liệu
  const statusOptions = STATUS_FILTERS.map((option) => ({
    value: option.value,
    label: counts ? `${option.label} (${formatNumber(counts[option.value])})` : option.label,
  }));

  const columns: ReadonlyArray<DataTableColumn<InventoryRow>> = [
    {
      key: 'product',
      header: 'Sản phẩm',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.SanPham?.AnhChinh ? (
            <img src={row.SanPham.AnhChinh} alt="" className="size-12 shrink-0 rounded-control object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-faint">
              <Package className="size-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-medium text-ink">{row.SanPham?.TenSP ?? 'Sản phẩm đã xóa'}</p>
            <p className="text-xs text-ink-muted">
              {row.SanPham?.TenTH}
              {row.SanPham?.DaAn && ' · Đang ẩn'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'volume',
      header: 'Dung tích',
      className: 'whitespace-nowrap',
      render: (row) => row.DungTich ?? '—',
    },
    {
      key: 'price',
      header: 'Giá bán',
      align: 'right',
      hideBelow: 'md',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => formatVnd(row.Gia),
    },
    {
      key: 'stock',
      header: 'Tồn kho',
      align: 'right',
      className: 'whitespace-nowrap font-semibold tabular-nums',
      render: (row) => formatNumber(row.SoLuongCo),
    },
    {
      key: 'status',
      header: 'Tình trạng',
      render: (row) => (
        <StatusBadge tone={STOCK_STATUS_TONE[row.TinhTrang]}>{STOCK_STATUS_LABEL[row.TinhTrang]}</StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={PackagePlus}
          aria-label={`Điều chỉnh tồn kho ${row.SanPham?.TenSP ?? ''} ${row.DungTich ?? ''}`.trim()}
          title="Điều chỉnh tồn kho"
          onClick={() => setAdjusting(row)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        description={
          <>
            Tồn kho theo từng dung tích của sản phẩm.
            {data && (
              <>
                {' '}
                Tổng tồn: <strong className="text-ink tabular-nums">{formatNumber(data.tongTon)}</strong> chai
              </>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <TextInput
            aria-label="Tìm sản phẩm trong kho"
            placeholder="Tìm theo tên sản phẩm"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Sắp hết khi tồn ≤
          <TextInput
            inputMode="numeric"
            maxLength={4}
            aria-label="Ngưỡng sắp hết hàng"
            invalid={nguongInvalid}
            className="w-20"
            value={nguongText}
            onChange={(event) => {
              setNguongText(event.target.value.replace(/\D/g, ''));
              setPage(1);
            }}
          />
        </label>
      </div>

      {nguongInvalid && (
        <p role="alert" className="text-sm text-danger">
          Ngưỡng phải từ 1 đến 1000, tạm dùng mặc định ({DEFAULT_LOW_STOCK}).
        </p>
      )}

      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          ariaLabel="Lọc theo tình trạng tồn kho"
          options={statusOptions}
          value={trangThai}
          onChange={(value) => {
            setTrangThai(value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Tồn kho theo biến thể"
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={filtering ? 'Không có sản phẩm phù hợp' : 'Kho đang trống'}
        emptyDescription={
          filtering ? 'Thử đổi từ khóa hoặc tình trạng.' : 'Thêm sản phẩm và dung tích ở trang Sản phẩm để quản lý tồn kho.'
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

      {adjusting && (
        <StockAdjustModal
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

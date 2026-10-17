import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import { TextInput } from '../../components/common/FormField';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import SegmentedControl from '../../components/common/SegmentedControl';
import StatusBadge from '../../components/common/StatusBadge';
import VoucherFormModal from '../../components/vouchers/VoucherFormModal';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getErrorMessage } from '../../lib/errors';
import { formatNumber, formatVnd } from '../../lib/format';
import { VOUCHER_STATUS_LABEL, VOUCHER_STATUS_TONE, formatDiscount, formatVnDate } from '../../lib/voucher';
import { voucherService } from '../../services/voucherService.ts';
import { toast } from '../../store/toastStore';
import type { AdminVoucher, VoucherStatusFilter } from '../../types/voucher.ts';

const PAGE_SIZES = [12, 24, 48] as const;

const STATUS_FILTERS: ReadonlyArray<{ value: VoucherStatusFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hoatdong', label: VOUCHER_STATUS_LABEL.hoatdong },
  { value: 'saptoi', label: VOUCHER_STATUS_LABEL.saptoi },
  { value: 'hethan', label: VOUCHER_STATUS_LABEL.hethan },
  { value: 'hetluot', label: VOUCHER_STATUS_LABEL.hetluot },
  { value: 'tat', label: VOUCHER_STATUS_LABEL.tat },
];

export default function VouchersPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState<VoucherStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const debouncedSearch = useDebouncedValue(search.trim());

  const load = useCallback(
    () => voucherService.list({ page, limit: pageSize, q: debouncedSearch, trangthai: trangThai }),
    [page, pageSize, debouncedSearch, trangThai],
  );
  const { data, loading, error, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên bảng và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  // undefined = đóng, null = thêm mới, có voucher = sửa voucher đó
  const [editing, setEditing] = useState<AdminVoucher | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<AdminVoucher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const counts = data?.counts;
  const filtering = debouncedSearch !== '' || trangThai !== 'all';

  // Gắn số voucher vào nhãn từng tab khi đã có dữ liệu
  const statusOptions = STATUS_FILTERS.map((option) => ({
    value: option.value,
    label: counts ? `${option.label} (${formatNumber(counts[option.value])})` : option.label,
  }));

  const toggleActive = async (voucher: AdminVoucher) => {
    setTogglingId(voucher._id);
    try {
      await voucherService.setActive(voucher._id, !voucher.DangBat);
      toast.success(voucher.DangBat ? 'Đã tắt voucher' : 'Đã bật voucher');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await voucherService.remove(toDelete._id);
      toast.success('Đã xóa voucher');
      // xóa dòng cuối của trang cuối thì lùi về trang trước, tránh hiện trang trống
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const columns: ReadonlyArray<DataTableColumn<AdminVoucher>> = [
    {
      key: 'code',
      header: 'Mã voucher',
      render: (row) =>
        row.MaCode ? (
          <span className="font-mono font-medium text-ink">{row.MaCode}</span>
        ) : (
          <span className="text-ink-faint" title="Voucher cũ chưa có mã, bấm Sửa để đặt mã">
            Chưa có mã
          </span>
        ),
    },
    {
      key: 'discount',
      header: 'Mức giảm',
      className: 'whitespace-nowrap',
      render: (row) => (
        <div>
          <p className="font-medium text-ink tabular-nums">{formatDiscount(row)}</p>
          {row.LoaiGiam === 'phantram' && row.GiamToiDa !== null && (
            <p className="text-xs text-ink-muted">Tối đa {formatVnd(row.GiamToiDa)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'condition',
      header: 'Điều kiện',
      hideBelow: 'md',
      className: 'whitespace-nowrap',
      render: (row) => (row.DonToiThieu > 0 ? `Đơn từ ${formatVnd(row.DonToiThieu)}` : 'Mọi đơn hàng'),
    },
    {
      key: 'period',
      header: 'Thời gian',
      hideBelow: 'lg',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => `${formatVnDate(row.NgayBatDau)} – ${formatVnDate(row.NgayKetThuc)}`,
    },
    {
      key: 'usage',
      header: 'Đã dùng',
      align: 'right',
      hideBelow: 'sm',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => `${formatNumber(row.DaDung)} / ${row.SoLuong === null ? '∞' : formatNumber(row.SoLuong)}`,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge tone={VOUCHER_STATUS_TONE[row.TinhTrang]}>{VOUCHER_STATUS_LABEL[row.TinhTrang]}</StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => {
        const name = row.MaCode ?? 'voucher';
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={Power}
              loading={togglingId === row._id}
              aria-label={`${row.DangBat ? 'Tắt' : 'Bật'} ${name}`}
              title={row.DangBat ? 'Tắt voucher' : 'Bật voucher'}
              onClick={() => toggleActive(row)}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              aria-label={`Sửa ${name}`}
              title="Sửa"
              onClick={() => setEditing(row)}
            />
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                aria-label={`Xóa ${name}`}
                title="Xóa"
                onClick={() => setToDelete(row)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        description="Tạo mã khuyến mãi, đặt điều kiện áp dụng và theo dõi số lượt đã dùng."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing(null)}>
            Thêm voucher
          </Button>
        }
      />

      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <TextInput
          aria-label="Tìm voucher"
          placeholder="Tìm theo mã voucher"
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
          ariaLabel="Lọc theo tình trạng voucher"
          options={statusOptions}
          value={trangThai}
          onChange={(value) => {
            setTrangThai(value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Danh sách voucher"
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={filtering ? 'Không có voucher phù hợp' : 'Chưa có voucher nào'}
        emptyDescription={filtering ? 'Thử đổi từ khóa hoặc tình trạng.' : 'Bấm "Thêm voucher" để tạo mã khuyến mãi đầu tiên.'}
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

      {editing !== undefined && (
        <VoucherFormModal
          editing={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Xóa voucher"
        message={
          <>
            Xóa voucher <strong className="font-mono text-ink">{toDelete?.MaCode ?? ''}</strong>? Voucher đã được dùng
            trong đơn hàng sẽ không xóa được, khi đó hãy tắt voucher thay vì xóa.
          </>
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

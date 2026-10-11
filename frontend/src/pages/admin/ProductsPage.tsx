import { useCallback, useEffect, useState } from 'react';
import { Boxes, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import { TextInput } from '../../components/common/FormField';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import SegmentedControl from '../../components/common/SegmentedControl';
import StatusBadge from '../../components/common/StatusBadge';
import ProductFormModal from '../../components/products/ProductFormModal';
import ProductVariantsModal from '../../components/products/ProductVariantsModal';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getErrorMessage } from '../../lib/errors';
import { formatNumber, formatVnd } from '../../lib/format';
import { GIOI_TINH_LABEL } from '../../lib/productOptions';
import { productService } from '../../services/productService';
import { toast } from '../../store/toastStore';
import type { AdminProductRow, TrangThaiFilter } from '../../types/product';

const STATUS_OPTIONS: ReadonlyArray<{ value: TrangThaiFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hien', label: 'Đang bán' },
  { value: 'an', label: 'Đã ẩn' },
];

const PAGE_SIZES = [12, 24, 48] as const;

function formatPriceRange(row: AdminProductRow): string {
  if (row.GiaCaoNhat === 0) return '—';
  if (row.GiaThapNhat === row.GiaCaoNhat) return formatVnd(row.GiaThapNhat);
  return `${formatVnd(row.GiaThapNhat)} – ${formatVnd(row.GiaCaoNhat)}`;
}

export default function ProductsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState<TrangThaiFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const debouncedSearch = useDebouncedValue(search.trim());

  const load = useCallback(
    () => productService.list({ page, limit: pageSize, q: debouncedSearch, trangthai: trangThai }),
    [page, pageSize, debouncedSearch, trangThai],
  );
  const { data, loading, error, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên bảng và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const [formFor, setFormFor] = useState<{ id: string | null } | null>(null);
  const [variantsFor, setVariantsFor] = useState<AdminProductRow | null>(null);
  const [toDelete, setToDelete] = useState<AdminProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const filtering = debouncedSearch !== '' || trangThai !== 'all';

  const toggleHidden = async (row: AdminProductRow) => {
    setTogglingId(row._id);
    try {
      await productService.setHidden(row._id, !row.DaAn);
      toast.success(row.DaAn ? 'Đã hiện sản phẩm' : 'Đã ẩn sản phẩm');
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
      await productService.remove(toDelete._id);
      toast.success('Đã xóa sản phẩm');
      // xóa dòng cuối của trang cuối thì lùi về trang trước
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const columns: ReadonlyArray<DataTableColumn<AdminProductRow>> = [
    {
      key: 'name',
      header: 'Sản phẩm',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{row.TenSP}</p>
          <p className="text-xs text-ink-muted">
            {[row.ThuongHieu?.TenTH, row.DanhMuc?.TenDM].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    { key: 'gender', header: 'Giới tính', hideBelow: 'md', render: (row) => GIOI_TINH_LABEL[row.GioiTinh] },
    {
      key: 'price',
      header: 'Giá',
      align: 'right',
      hideBelow: 'sm',
      className: 'whitespace-nowrap tabular-nums',
      render: formatPriceRange,
    },
    {
      key: 'stock',
      header: 'Tồn kho',
      align: 'right',
      hideBelow: 'lg',
      className: 'tabular-nums',
      render: (row) => (row.TongTon === 0 ? <StatusBadge tone="danger">Hết hàng</StatusBadge> : formatNumber(row.TongTon)),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) =>
        row.DaAn ? <StatusBadge>Đã ẩn</StatusBadge> : <StatusBadge tone="success">Đang bán</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            aria-label={`Sửa ${row.TenSP}`}
            title="Sửa"
            onClick={() => setFormFor({ id: row._id })}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Boxes}
            aria-label={`Biến thể của ${row.TenSP}`}
            title="Biến thể (dung tích, giá, tồn kho)"
            onClick={() => setVariantsFor(row)}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={row.DaAn ? Eye : EyeOff}
            aria-label={row.DaAn ? `Hiện ${row.TenSP}` : `Ẩn ${row.TenSP}`}
            title={row.DaAn ? 'Hiện sản phẩm' : 'Ẩn sản phẩm'}
            loading={togglingId === row._id}
            onClick={() => toggleHidden(row)}
          />
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              aria-label={`Xóa ${row.TenSP}`}
              title="Xóa"
              onClick={() => setToDelete(row)}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        description="Quản lý sản phẩm, giá và tồn kho theo từng dung tích."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setFormFor({ id: null })}>
            Thêm sản phẩm
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <TextInput
            aria-label="Tìm sản phẩm theo tên"
            placeholder="Tìm theo tên sản phẩm"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <SegmentedControl
          ariaLabel="Lọc theo trạng thái"
          options={STATUS_OPTIONS}
          value={trangThai}
          onChange={(value) => {
            setTrangThai(value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Danh sách sản phẩm"
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={filtering ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
        emptyDescription={filtering ? 'Thử đổi từ khóa hoặc bộ lọc trạng thái.' : 'Bấm "Thêm sản phẩm" để tạo sản phẩm đầu tiên.'}
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

      {formFor && (
        <ProductFormModal
          productId={formFor.id}
          onClose={() => setFormFor(null)}
          onSaved={() => {
            setFormFor(null);
            reload();
          }}
        />
      )}

      {variantsFor && (
        <ProductVariantsModal
          productId={variantsFor._id}
          productName={variantsFor.TenSP}
          canDelete={isAdmin}
          onClose={() => setVariantsFor(null)}
          onChanged={reload}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Xóa sản phẩm"
        message={
          <>
            Xóa vĩnh viễn <strong className="text-ink">{toDelete?.TenSP}</strong> cùng các dung tích và hình ảnh? Sản phẩm
            đã có trong đơn hàng sẽ không xóa được, khi đó hãy dùng nút Ẩn.
          </>
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
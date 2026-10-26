import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Lock, LockOpen, Search } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import { SelectInput, TextInput } from '../../components/common/FormField';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getErrorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { getInitials } from '../../lib/user';
import { adminUserService } from '../../services/adminUserService';
import { toast } from '../../store/toastStore';
import type { AdminUserRow, StaffRole, UserRole, UserStatusFilter } from '../../types/adminUser';

const PAGE_SIZES = [10, 20, 50] as const;

const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'Khách hàng',
  staff: 'Quản lý',
  admin: 'Admin',
};

const ROLE_FILTERS: ReadonlyArray<{ value: UserRole | 'all'; label: string }> = [
  { value: 'all', label: 'Vai trò: Tất cả' },
  { value: 'customer', label: ROLE_LABEL.customer },
  { value: 'staff', label: ROLE_LABEL.staff },
  { value: 'admin', label: ROLE_LABEL.admin },
];

const STATUS_FILTERS: ReadonlyArray<{ value: UserStatusFilter; label: string }> = [
  { value: 'all', label: 'Trạng thái: Tất cả' },
  { value: 'hoatdong', label: 'Hoạt động' },
  { value: 'khoa', label: 'Đang khóa' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?._id;

  const [search, setSearch] = useState('');
  const [vaiTro, setVaiTro] = useState<UserRole | 'all'>('all');
  const [trangThai, setTrangThai] = useState<UserStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const debouncedSearch = useDebouncedValue(search.trim());

  const load = useCallback(
    () => adminUserService.list({ page, limit: pageSize, q: debouncedSearch, vaitro: vaiTro, trangthai: trangThai }),
    [page, pageSize, debouncedSearch, vaiTro, trangThai],
  );
  const { data, loading, error, reload } = useAsyncData(load);

  // Lỗi khi đang có dữ liệu cũ: giữ nguyên bảng và báo bằng toast
  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const [toLock, setToLock] = useState<AdminUserRow | null>(null);
  const [toReset, setToReset] = useState<AdminUserRow | null>(null);
  const [busyConfirm, setBusyConfirm] = useState(false);
  // id người dùng đang được đổi quyền / mở khóa, để khóa đúng dòng đó
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const filtering = debouncedSearch !== '' || vaiTro !== 'all' || trangThai !== 'all';

  const changeRole = async (row: AdminUserRow, next: StaffRole) => {
    if (next === row.VaiTro) return;
    setBusyId(row._id);
    try {
      toast.success(await adminUserService.updateRole(row._id, next));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const unlock = async (row: AdminUserRow) => {
    setBusyId(row._id);
    try {
      toast.success(await adminUserService.setLocked(row._id, false));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmLock = async () => {
    if (!toLock) return;
    setBusyConfirm(true);
    try {
      toast.success(await adminUserService.setLocked(toLock._id, true));
      setToLock(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyConfirm(false);
    }
  };

  const confirmReset = async () => {
    if (!toReset) return;
    setBusyConfirm(true);
    try {
      toast.success(await adminUserService.resetPassword(toReset._id));
      setToReset(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyConfirm(false);
    }
  };

  const columns: ReadonlyArray<DataTableColumn<AdminUserRow>> = [
    {
      key: 'user',
      header: 'Người dùng',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
            aria-hidden="true"
          >
            {getInitials(row.HoTen)}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-ink">{row.HoTen}</p>
            <p className="truncate text-xs text-ink-muted">{row.Email ?? <span className="text-ink-faint">Chưa có email</span>}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      hideBelow: 'md',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => row.SoDienThoai,
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      hideBelow: 'lg',
      className: 'max-w-56',
      render: (row) =>
        row.DiaChi ? (
          <span className="line-clamp-2" title={row.DiaChi}>
            {row.DiaChi}
          </span>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'birthday',
      header: 'Ngày sinh',
      hideBelow: 'lg',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => (row.NgaySinh ? formatDate(row.NgaySinh) : <span className="text-ink-faint">—</span>),
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => {
        const isSelf = row._id === currentUserId;
        // Khách hàng ở bảng riêng nên không đổi quyền được; không tự đổi quyền chính mình
        if (row.VaiTro === 'customer') return <StatusBadge>{ROLE_LABEL.customer}</StatusBadge>;
        return (
          <SelectInput
            aria-label={`Vai trò của ${row.HoTen}`}
            title={isSelf ? 'Bạn không thể tự đổi quyền của chính mình' : undefined}
            className="h-9 w-auto min-w-28"
            value={row.VaiTro}
            disabled={isSelf || busyId === row._id}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => void changeRole(row, event.target.value as StaffRole)}
          >
            <option value="staff">{ROLE_LABEL.staff}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
          </SelectInput>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => {
        const isSelf = row._id === currentUserId;
        if (row.BiKhoa) {
          return (
            <Button
              variant="danger"
              size="sm"
              icon={LockOpen}
              loading={busyId === row._id}
              title="Bấm để mở khóa"
              aria-label={`Mở khóa tài khoản ${row.HoTen}`}
              onClick={() => void unlock(row)}
            >
              Đang khóa
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            icon={Lock}
            disabled={isSelf}
            title={isSelf ? 'Bạn không thể tự khóa tài khoản của chính mình' : 'Bấm để khóa tài khoản'}
            aria-label={`Khóa tài khoản ${row.HoTen}`}
            onClick={() => setToLock(row)}
          >
            Hoạt động
          </Button>
        );
      },
    },
    {
      key: 'password',
      header: 'Mật khẩu',
      render: (row) => (
        <Button
          size="sm"
          icon={KeyRound}
          disabled={!row.Email}
          title={row.Email ? 'Tạo mật khẩu mới và gửi email' : 'Người dùng chưa có email'}
          aria-label={`Reset mật khẩu của ${row.HoTen}`}
          onClick={() => setToReset(row)}
        >
          Reset
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader description="Phân quyền nhân viên, khóa / mở khóa tài khoản và reset mật khẩu cho mọi người dùng." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <TextInput
            aria-label="Tìm người dùng"
            placeholder="Tìm theo tên, email, SĐT…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <SelectInput
          aria-label="Lọc theo vai trò"
          className="sm:w-auto"
          value={vaiTro}
          onChange={(event) => {
            setVaiTro(event.target.value as UserRole | 'all');
            setPage(1);
          }}
        >
          {ROLE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          aria-label="Lọc theo trạng thái"
          className="sm:w-auto"
          value={trangThai}
          onChange={(event) => {
            setTrangThai(event.target.value as UserStatusFilter);
            setPage(1);
          }}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </div>

      <DataTable
        caption="Danh sách người dùng"
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={filtering ? 'Không có người dùng phù hợp' : 'Chưa có người dùng nào'}
        emptyDescription={filtering ? 'Thử đổi từ khóa hoặc bộ lọc.' : undefined}
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

      <ConfirmDialog
        open={toLock !== null}
        title="Khóa tài khoản?"
        message={
          <>
            Người dùng “{toLock?.HoTen}” sẽ không thể đăng nhập cho đến khi được mở khóa.
          </>
        }
        confirmLabel="Khóa"
        loading={busyConfirm}
        onConfirm={() => void confirmLock()}
        onCancel={() => setToLock(null)}
      />

      <ConfirmDialog
        open={toReset !== null}
        title="Reset mật khẩu?"
        tone="primary"
        message={
          <>
            Hệ thống tạo mật khẩu mới và gửi tới email của người dùng
            {toReset?.Email ? <> ({toReset.Email})</> : null}. Mật khẩu cũ sẽ không dùng được nữa.
          </>
        }
        confirmLabel="Gửi email"
        loading={busyConfirm}
        onConfirm={() => void confirmReset()}
        onCancel={() => setToReset(null)}
      />
    </div>
  );
}

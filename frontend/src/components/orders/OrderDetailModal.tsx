import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Package } from 'lucide-react';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorState from '../common/ErrorState';
import Modal from '../common/Modal';
import Skeleton from '../common/Skeleton';
import StatusBadge from '../common/StatusBadge';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/errors';
import { formatDateTime, formatNumber, formatOrderCode, formatVnd } from '../../lib/format';
import { getNextStatuses, getOrderStatusTone } from '../../lib/orderStatus';
import { orderService } from '../../services/orderService';
import { toast } from '../../store/toastStore';
import type { AdminOrderDetail } from '../../types/order';
import type { TrangThaiDonHang } from '../../types/sales';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  /** Gọi sau khi đổi trạng thái để trang danh sách tải lại */
  onChanged: () => void;
}

/** Nhãn nút cho từng trạng thái đích */
const ACTION_LABEL: Record<TrangThaiDonHang, string> = {
  'Chờ xác nhận': 'Chờ xác nhận',
  'Đang xử lý': 'Xác nhận đơn',
  'Đang giao': 'Bắt đầu giao hàng',
  'Hoàn thành': 'Hoàn thành đơn',
  'Đã hủy': 'Hủy đơn',
};

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <dl className="mt-2 space-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-ink">{children || '—'}</dd>
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function OrderDetailModal({ orderId, onClose, onChanged }: OrderDetailModalProps) {
  const load = useCallback(() => orderService.get(orderId), [orderId]);
  const { data, loading, error, reload } = useAsyncData(load);

  // Sau khi đổi trạng thái, backend trả luôn chi tiết mới nên dùng thẳng, không tải lại
  const [updated, setUpdated] = useState<AdminOrderDetail | null>(null);
  const order = updated ?? data;

  const [changing, setChanging] = useState<TrangThaiDonHang | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const changeStatus = async (target: TrangThaiDonHang) => {
    setChanging(target);
    try {
      const next = await orderService.updateStatus(orderId, target);
      setUpdated(next);
      toast.success(target === 'Đã hủy' ? 'Đã hủy đơn hàng' : `Đơn hàng chuyển sang "${target}"`);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChanging(null);
      setConfirmCancel(false);
    }
  };

  const nextStatuses = order ? getNextStatuses(order.TrangThai) : [];
  const forward = nextStatuses.filter((status) => status !== 'Đã hủy');
  const canCancel = nextStatuses.includes('Đã hủy');
  const giamGia = order ? order.TamTinh - order.TongTien : 0;

  return (
    <>
      <Modal
        open
        size="lg"
        onClose={onClose}
        busy={changing !== null}
        title={order ? `Đơn hàng ${formatOrderCode(order._id)}` : 'Đơn hàng'}
        description={order ? `Đặt lúc ${formatDateTime(order.NgayDat)}` : undefined}
        footer={
          <>
            <Button onClick={onClose} disabled={changing !== null}>
              Đóng
            </Button>
            {order && canCancel && (
              <Button variant="danger" disabled={changing !== null} onClick={() => setConfirmCancel(true)}>
                {ACTION_LABEL['Đã hủy']}
              </Button>
            )}
            {order &&
              forward.map((status) => (
                <Button
                  key={status}
                  variant="primary"
                  loading={changing === status}
                  disabled={changing !== null}
                  onClick={() => changeStatus(status)}
                >
                  {ACTION_LABEL[status]}
                </Button>
              ))}
          </>
        }
      >
        {!order && loading && <LoadingBody />}
        {!order && !loading && error && <ErrorState message={error} onRetry={reload} />}

        {order && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={getOrderStatusTone(order.TrangThai)}>{order.TrangThai}</StatusBadge>
              <span className="text-sm text-ink-muted">
                Xử lý bởi {order.NhanVien ? order.NhanVien.HoTenNV : 'chưa có ai nhận đơn'}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock title="Khách đặt hàng">
                <InfoRow label="Họ tên">{order.HoTenKH}</InfoRow>
                <InfoRow label="Điện thoại">{order.SoDienThoai}</InfoRow>
                <InfoRow label="Email">{order.Email}</InfoRow>
                <InfoRow label="Địa chỉ">{order.DiaChi}</InfoRow>
              </InfoBlock>
              <InfoBlock title="Người nhận hàng">
                <InfoRow label="Họ tên">{order.HoTenNguoiNhan}</InfoRow>
                <InfoRow label="Điện thoại">{order.SoDienThoaiNguoiNhan}</InfoRow>
                <InfoRow label="Địa chỉ">{order.DiaChiNguoiNhan}</InfoRow>
                <InfoRow label="Thanh toán">{order.PhuongThucThanhToan?.TenPTTT}</InfoRow>
              </InfoBlock>
            </div>

            {order.GhiChu && (
              <p className="rounded-card bg-surface-muted px-4 py-3 text-sm text-ink">
                <span className="font-medium">Ghi chú của khách: </span>
                {order.GhiChu}
              </p>
            )}

            <div className="overflow-hidden rounded-card border border-line">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Sản phẩm trong đơn</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface-muted text-xs font-medium text-ink-muted">
                      <th scope="col" className="px-4 py-2.5 text-left">
                        Sản phẩm
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right">
                        SL
                      </th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right sm:table-cell">
                        Đơn giá
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.ChiTiet.map((line) => (
                      <tr key={line._id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {line.SanPham?.AnhChinh ? (
                              <img
                                src={line.SanPham.AnhChinh}
                                alt=""
                                className="size-12 shrink-0 rounded-control object-cover"
                              />
                            ) : (
                              <span className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-faint">
                                <Package className="size-5" aria-hidden="true" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-ink">{line.SanPham?.TenSP ?? 'Sản phẩm đã bị xóa'}</p>
                              <p className="text-xs text-ink-muted">
                                {[line.SanPham?.TenTH, line.DungTich].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatNumber(line.SoLuongMua)}</td>
                        <td className="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell">
                          {formatVnd(line.DonGia)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                          {formatVnd(line.ThanhTien)}
                        </td>
                      </tr>
                    ))}
                    {order.ChiTiet.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                          Đơn hàng chưa có dòng sản phẩm nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <dl className="space-y-1.5 border-t border-line px-4 py-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Tạm tính</dt>
                  <dd className="tabular-nums text-ink">{formatVnd(order.TamTinh)}</dd>
                </div>
                {giamGia > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Giảm giá{order.Voucher ? ' (voucher)' : ''}</dt>
                    <dd className="tabular-nums text-ink">−{formatVnd(giamGia)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 text-base font-semibold">
                  <dt className="text-ink">Tổng thanh toán</dt>
                  <dd className="tabular-nums text-ink">{formatVnd(order.TongTien)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        title="Hủy đơn hàng"
        confirmLabel="Hủy đơn"
        cancelLabel="Không hủy"
        loading={changing === 'Đã hủy'}
        onConfirm={() => changeStatus('Đã hủy')}
        onCancel={() => setConfirmCancel(false)}
        message={
          <>
            Hủy đơn <strong className="text-ink">{order ? formatOrderCode(order._id) : ''}</strong>? Số lượng sản
            phẩm trong đơn sẽ được cộng lại vào kho và không thể khôi phục đơn đã hủy.
          </>
        }
      />
    </>
  );
}

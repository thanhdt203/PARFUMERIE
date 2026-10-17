import { useCallback } from 'react';
import type { ReactNode } from 'react';
import Button from '../common/Button';
import ErrorState from '../common/ErrorState';
import Modal from '../common/Modal';
import Skeleton from '../common/Skeleton';
import StatusBadge from '../common/StatusBadge';
import { useAsyncData } from '../../hooks/useAsyncData';
import { formatDate, formatDateTime, formatNumber, formatOrderCode, formatVnd } from '../../lib/format';
import { getOrderStatusTone } from '../../lib/orderStatus';
import { adminCustomerService } from '../../services/adminCustomerService';

interface CustomerDetailModalProps {
  customerId: string;
  onClose: () => void;
  /** Bấm một đơn trong lịch sử: trang cha đóng hộp này và mở chi tiết đơn */
  onOpenOrder: (orderId: string) => void;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-ink">{children || '—'}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink tabular-nums">{value}</p>
    </div>
  );
}

export default function CustomerDetailModal({ customerId, onClose, onOpenOrder }: CustomerDetailModalProps) {
  const load = useCallback(() => adminCustomerService.get(customerId), [customerId]);
  const { data: customer, loading, error, reload } = useAsyncData(load);

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={customer ? `${customer.Ho} ${customer.Ten}` : 'Khách hàng'}
      description={customer ? `Đăng ký ngày ${formatDate(customer.createdAt)}` : undefined}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      {!customer && loading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {!customer && !loading && error && <ErrorState message={error} onRetry={reload} />}

      {customer && (
        <div className="space-y-4">
          <section className="rounded-card border border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Thông tin liên hệ</h3>
            <dl className="mt-2 space-y-1.5 text-sm">
              <InfoRow label="Họ tên">{`${customer.Ho} ${customer.Ten}`}</InfoRow>
              <InfoRow label="Điện thoại">{customer.SoDienThoai}</InfoRow>
              <InfoRow label="Email">{customer.Email}</InfoRow>
              <InfoRow label="Mua gần nhất">{customer.LanMuaCuoi ? formatDateTime(customer.LanMuaCuoi) : 'Chưa mua lần nào'}</InfoRow>
            </dl>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Tổng chi tiêu" value={formatVnd(customer.TongChiTieu)} />
            <Stat label="Số đơn (không tính đơn hủy)" value={formatNumber(customer.SoDon)} />
            <Stat label="Hoàn thành / Đã hủy" value={`${formatNumber(customer.SoDonHoanThanh)} / ${formatNumber(customer.SoDonHuy)}`} />
          </div>

          <div className="overflow-hidden rounded-card border border-line">
            <div className="border-b border-line bg-surface-muted px-4 py-2.5 text-xs font-medium text-ink-muted">
              Đơn hàng gần đây
            </div>
            {customer.DonGanDay.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">Khách chưa đặt đơn nào.</p>
            ) : (
              <ul>
                {customer.DonGanDay.map((order) => (
                  <li key={order._id} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      onClick={() => onOpenOrder(order._id)}
                      className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted"
                      aria-label={`Xem đơn ${formatOrderCode(order._id)}`}
                    >
                      <span className="font-medium text-ink">{formatOrderCode(order._id)}</span>
                      <span className="text-ink-muted tabular-nums">{formatDateTime(order.NgayDat)}</span>
                      <span className="tabular-nums text-ink">{formatVnd(order.TongTien)}</span>
                      <StatusBadge tone={getOrderStatusTone(order.TrangThai)}>{order.TrangThai}</StatusBadge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

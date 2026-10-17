import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Package } from 'lucide-react';
import SiteLayout from '../components/SiteLayout';
import { BottlePlaceholder } from '../components/shop/ProductCard';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime, formatOrderCode, formatVnd } from '../lib/format';
import { getOrderStatusTone } from '../lib/orderStatus';
import { variantLabel } from '../lib/productOptions';
import { customerOrderService } from '../services/customerOrderService';
import type { MyOrder, MyOrderItem, MyOrderListResponse } from '../types/customerOrder';
import '../components/shop/ProductCard.css';
import './MyOrdersPages.css';

// ---------- Dùng chung ----------

function Notice({ title, text, to, action, icon = true }: { title: string; text: string; to: string; action: string; icon?: boolean }) {
  return (
    <div className="site__empty">
      {icon && <Package className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />}
      <h1>{title}</h1>
      <p>{text}</p>
      <Link to={to} className="site__empty-link">
        {action}
      </Link>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="myorders" aria-busy="true">
      <div className="myorders__head">
        <div className="myorders__skel myorders__skel--title" />
      </div>
      <div className="myorders__pad">
        <div className="myorders__skel myorders__skel--block" />
        <div className="myorders__skel myorders__skel--block" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="myorders__state" role="alert">
      <p>{message}</p>
      <button type="button" className="myorders__link" onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}

// Chưa đăng nhập / không phải khách hàng thì trả về màn hình thay thế, còn lại trả về null
function renderGate(role: Role | null, authLoading: boolean): ReactNode {
  if (authLoading) return <Skeleton />;
  if (!role) {
    return (
      <Notice
        title="Đăng nhập để xem đơn hàng"
        text="Đơn hàng được lưu theo tài khoản của bạn."
        to="/login"
        action="Đăng nhập"
      />
    );
  }
  if (role !== 'customer') {
    return (
      <Notice
        title="Tài khoản quản trị không có đơn mua hàng"
        text="Quản lý đơn của khách tại trang quản trị."
        to="/admin/don-hang"
        action="Vào trang quản trị"
        icon={false}
      />
    );
  }
  return null;
}

function StatusChip({ status }: { status: string }) {
  return <span className={`myorders__status myorders__status--${getOrderStatusTone(status)}`}>{status}</span>;
}

function Thumb({ item }: { item: MyOrderItem }) {
  const [failed, setFailed] = useState(false);
  const src = item.SanPham?.AnhChinh;
  return (
    <span className="myorders__thumb" aria-hidden="true">
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <BottlePlaceholder />}
    </span>
  );
}

const itemName = (item: MyOrderItem) =>
  `${item.SanPham?.TenSP ?? 'Sản phẩm đã ngừng bán'}${item.DungTich ? ` - ${variantLabel(item.DungTich)}` : ''}`;

// ---------- Danh sách đơn: /don-hang ----------

function OrderCard({ order }: { order: MyOrder }) {
  const shown = order.ChiTiet.slice(0, 2);
  const more = order.ChiTiet.length - shown.length;
  return (
    <li className="myorders__card">
      <div className="myorders__card-head">
        <div>
          <Link to={`/don-hang/${order._id}`} className="myorders__code">
            Đơn {formatOrderCode(order._id)}
          </Link>
          <p className="myorders__date">{formatDateTime(order.NgayDat)}</p>
        </div>
        <StatusChip status={order.TrangThai} />
      </div>

      <ul className="myorders__lines">
        {shown.map((item) => (
          <li key={item._id} className="myorders__line">
            <Thumb item={item} />
            <span className="myorders__line-name">{itemName(item)}</span>
            <span className="myorders__line-qty">× {item.SoLuongMua}</span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="myorders__more">và {more} sản phẩm khác</p>}

      <div className="myorders__card-foot">
        <p className="myorders__total">
          Tổng tiền: <strong>{formatVnd(order.TongTien)}</strong>
        </p>
        <Link to={`/don-hang/${order._id}`} className="myorders__btn myorders__btn--ghost">
          Xem chi tiết
        </Link>
      </div>
    </li>
  );
}

export function MyOrdersPage() {
  const { role, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);

  const load = useCallback(
    () =>
      role === 'customer'
        ? customerOrderService.list(page)
        : Promise.resolve<MyOrderListResponse | null>(null),
    [role, page],
  );
  const orders = useAsyncData<MyOrderListResponse | null>(load);

  let content: ReactNode = renderGate(role, authLoading);
  if (!content) {
    if (orders.error) {
      content = <ErrorState message={orders.error} onRetry={orders.reload} />;
    } else if (!orders.data) {
      content = <Skeleton />;
    } else if (orders.data.data.length === 0 && page === 1) {
      content = (
        <Notice
          title="Bạn chưa có đơn hàng nào"
          text="Khi đặt hàng, đơn của bạn sẽ xuất hiện ở đây để theo dõi."
          to="/"
          action="Bắt đầu mua sắm"
        />
      );
    } else {
      const { data, pagination } = orders.data;
      content = (
        <section className="myorders" aria-labelledby="myorders-title" aria-busy={orders.loading}>
          <header className="myorders__head">
            <h1 id="myorders-title" className="myorders__title">
              Đơn hàng của tôi <span>({pagination.total} đơn)</span>
            </h1>
          </header>
          <div className="myorders__pad">
            <ul className="myorders__list">
              {data.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </ul>

            {pagination.totalPages > 1 && (
              <nav className="myorders__pager" aria-label="Phân trang đơn hàng">
                <button
                  type="button"
                  className="myorders__btn myorders__btn--ghost"
                  disabled={page <= 1 || orders.loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trang trước
                </button>
                <span>
                  Trang {pagination.page}/{pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="myorders__btn myorders__btn--ghost"
                  disabled={page >= pagination.totalPages || orders.loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </button>
              </nav>
            )}
          </div>
        </section>
      );
    }
  }

  return <SiteLayout crumb="Đơn hàng của tôi">{content}</SiteLayout>;
}

// ---------- Chi tiết đơn: /don-hang/:id ----------

function OrderDetail({ order, justOrdered, onChanged }: { order: MyOrder; justOrdered: boolean; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const canCancel = order.TrangThai === 'Chờ xác nhận';

  const handleCancel = async () => {
    setBusy(true);
    setMessage('');
    try {
      await customerOrderService.cancel(order._id);
      setConfirming(false);
      onChanged();
    } catch (err) {
      setMessage(getErrorMessage(err));
      onChanged(); // trạng thái có thể đã đổi (shop vừa xác nhận) nên tải lại
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="myorders" aria-labelledby="order-title">
      <header className="myorders__head myorders__head--row">
        <h1 id="order-title" className="myorders__title">
          Đơn {formatOrderCode(order._id)}
        </h1>
        <StatusChip status={order.TrangThai} />
      </header>

      <div className="myorders__pad">
        {justOrdered && (
          <p className="myorders__success" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              Đặt hàng thành công. Cửa hàng sẽ sớm xác nhận đơn của bạn, trạng thái đơn được cập nhật ngay tại trang này.
            </span>
          </p>
        )}

        <div className="myorders__detail">
          <div>
            <ul className="myorders__items">
              {order.ChiTiet.map((item) => (
                <li key={item._id} className="myorders__item">
                  <Thumb item={item} />
                  <div className="myorders__item-info">
                    {item.SanPham ? (
                      <Link to={`/nuoc-hoa/${item.SanPham._id}`} className="myorders__item-name">
                        {itemName(item)}
                      </Link>
                    ) : (
                      <p className="myorders__item-name">{itemName(item)}</p>
                    )}
                    <p className="myorders__item-meta">
                      {formatVnd(item.DonGia)} × {item.SoLuongMua}
                    </p>
                  </div>
                  <p className="myorders__item-total">{formatVnd(item.ThanhTien)}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="myorders__aside">
            <dl className="myorders__info">
              <div>
                <dt>Ngày đặt</dt>
                <dd>{formatDateTime(order.NgayDat)}</dd>
              </div>
              <div>
                <dt>Người nhận</dt>
                <dd>{order.HoTenNguoiNhan}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{order.SoDienThoaiNguoiNhan}</dd>
              </div>
              <div>
                <dt>Địa chỉ nhận hàng</dt>
                <dd>{order.DiaChiNguoiNhan}</dd>
              </div>
              <div>
                <dt>Thanh toán</dt>
                <dd>{order.PhuongThucThanhToan?.TenPTTT ?? 'Không rõ'}</dd>
              </div>
              {order.Voucher && (
                <div>
                  <dt>Mã giảm giá</dt>
                  <dd>
                    {order.Voucher.MaCode ?? 'Voucher'} (-{formatVnd(order.TienGiam)})
                  </dd>
                </div>
              )}
              {order.GhiChu && (
                <div>
                  <dt>Ghi chú</dt>
                  <dd>{order.GhiChu}</dd>
                </div>
              )}
            </dl>

            <p className="myorders__sum">
              <span>Thành tiền:</span>
              <strong>{formatVnd(order.TongTien)}</strong>
            </p>

            {message && (
              <p className="myorders__alert" role="alert">
                {message}
              </p>
            )}

            {canCancel &&
              (confirming ? (
                <div className="myorders__confirm" role="group" aria-label="Xác nhận hủy đơn">
                  <p>Hủy đơn này? Thao tác không thể hoàn tác.</p>
                  <div>
                    <button type="button" className="myorders__btn myorders__btn--danger" disabled={busy} onClick={handleCancel}>
                      {busy ? 'Đang hủy...' : 'Hủy đơn'}
                    </button>
                    <button
                      type="button"
                      className="myorders__btn myorders__btn--ghost"
                      disabled={busy}
                      onClick={() => setConfirming(false)}
                    >
                      Giữ đơn
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="myorders__btn myorders__btn--ghost" onClick={() => setConfirming(true)}>
                  Hủy đơn hàng
                </button>
              ))}

            <Link to="/don-hang" className="myorders__btn myorders__btn--ghost">
              Tất cả đơn hàng
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function MyOrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { role, loading: authLoading } = useAuth();
  const justOrdered = (location.state as { justOrdered?: boolean } | null)?.justOrdered === true;

  const load = useCallback(
    () => (role === 'customer' && id ? customerOrderService.get(id) : Promise.resolve<MyOrder | null>(null)),
    [role, id],
  );
  const order = useAsyncData<MyOrder | null>(load);

  let content: ReactNode = renderGate(role, authLoading);
  if (!content) {
    if (order.error) {
      content = <ErrorState message={order.error} onRetry={order.reload} />;
    } else if (!order.data) {
      content = <Skeleton />;
    } else {
      content = <OrderDetail order={order.data} justOrdered={justOrdered} onChanged={order.reload} />;
    }
  }

  return <SiteLayout crumb="Chi tiết đơn hàng">{content}</SiteLayout>;
}

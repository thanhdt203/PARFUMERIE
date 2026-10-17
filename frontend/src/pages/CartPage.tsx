import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import SiteLayout from '../components/SiteLayout';
import { BottlePlaceholder } from '../components/shop/ProductCard';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/errors';
import { formatVnd } from '../lib/format';
import { GIOI_TINH_LABEL, variantLabel } from '../lib/productOptions';
import { MAX_CART_QTY } from '../services/cartService';
import { useCartStore } from '../store/cartStore';
import type { CartItem } from '../types/cart';
import '../components/shop/ProductCard.css';
import './CartPage.css';

// Tên hiển thị: "Dior Sauvage EDP - Nam / Pháp / Chiết 10ml"
const itemTitle = (i: CartItem) =>
  `${i.TenSP} - ${GIOI_TINH_LABEL[i.GioiTinh] ?? i.GioiTinh} / ${i.XuatXu} / ${variantLabel(i.TenDungTich)}`;

function CartImage({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <Link to={`/nuoc-hoa/${item.MaSP}`} className="cart__img" aria-label={item.TenSP} tabIndex={-1}>
      {item.AnhChinh && !failed ? (
        <img src={item.AnhChinh} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <BottlePlaceholder />
      )}
    </Link>
  );
}

interface CartRowProps {
  item: CartItem;
  busy: boolean;
  onQty: (item: CartItem, qty: number) => void;
  onRemove: (item: CartItem) => void;
}

function CartRow({ item, busy, onQty, onRemove }: CartRowProps) {
  const maxQty = Math.min(MAX_CART_QTY, item.SoLuongCo);
  const qty = item.SoLuongChonMua;
  const warning =
    item.SoLuongCo <= 0
      ? 'Tạm hết hàng, hãy xóa khỏi giỏ.'
      : qty > item.SoLuongCo
        ? `Chỉ còn ${item.SoLuongCo} sản phẩm, hãy giảm số lượng.`
        : '';

  return (
    <li className="cart__row" aria-busy={busy}>
      <CartImage item={item} />

      <div className="cart__info">
        <Link to={`/nuoc-hoa/${item.MaSP}`} className="cart__name">
          {itemTitle(item)}
        </Link>
        {warning && (
          <p className="cart__warn" role="alert">
            {warning}
          </p>
        )}
      </div>

      <p className="cart__price">{formatVnd(item.Gia)}</p>

      <div className="cart__qty-cell">
        <div className="cart__qty" role="group" aria-label={`Số lượng ${item.TenSP}`}>
          <button
            type="button"
            aria-label="Giảm số lượng"
            disabled={busy || qty <= 1}
            onClick={() => onQty(item, qty - 1)}
          >
            <Minus size={12} aria-hidden="true" />
          </button>
          <output aria-live="polite">{qty}</output>
          <button
            type="button"
            aria-label="Tăng số lượng"
            disabled={busy || qty >= maxQty}
            onClick={() => onQty(item, qty + 1)}
          >
            <Plus size={12} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="cart__remove" disabled={busy} onClick={() => onRemove(item)}>
          Xóa
        </button>
      </div>
    </li>
  );
}

function CartSkeleton() {
  return (
    <div className="cart" aria-busy="true">
      <div className="cart__head">
        <div className="cart__skel cart__skel--title" />
      </div>
      <div className="cart__body">
        <div>
          {[0, 1].map((i) => (
            <div key={i} className="cart__row">
              <div className="cart__skel cart__skel--img" />
              <div className="cart__skel cart__skel--line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Empty({ icon = true, title, text, to, action }: { icon?: boolean; title: string; text: string; to: string; action: string }) {
  return (
    <div className="site__empty">
      {icon && <ShoppingCart className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />}
      <h1>{title}</h1>
      <p>{text}</p>
      <Link to={to} className="site__empty-link">
        {action}
      </Link>
    </div>
  );
}

export function CartPage() {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const { items, tongSoLuong, tamTinh, loaded, loading, error, load, setQty, remove } = useCartStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setMessage('');
    try {
      await action();
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleQty = (item: CartItem, qty: number) => run(item._id, () => setQty(item._id, qty));
  const handleRemove = (item: CartItem) => run(item._id, () => remove(item._id));

  // Còn dòng nào vượt tồn kho / hết hàng thì chưa cho mua
  const hasProblem = items.some((i) => i.SoLuongCo <= 0 || i.SoLuongChonMua > i.SoLuongCo);

  const handleBuyNow = () => navigate('/thanh-toan');

  let content;
  if (authLoading) {
    content = <CartSkeleton />;
  } else if (!role) {
    content = (
      <Empty
        title="Đăng nhập để xem giỏ hàng"
        text="Giỏ hàng được lưu theo tài khoản của bạn trên mọi thiết bị."
        to="/login"
        action="Đăng nhập"
      />
    );
  } else if (role !== 'customer') {
    content = (
      <Empty
        title="Tài khoản quản trị không có giỏ hàng"
        text="Hãy đăng nhập bằng tài khoản khách hàng để mua sắm."
        to="/"
        action="Về trang chủ"
      />
    );
  } else if (error && items.length === 0) {
    content = (
      <div className="cart__state" role="alert">
        <p>{error}</p>
        <button type="button" className="cart__link" onClick={() => void load()}>
          Thử lại
        </button>
      </div>
    );
  } else if (!loaded || (loading && items.length === 0)) {
    content = <CartSkeleton />;
  } else if (items.length === 0) {
    content = (
      <Empty
        title="Giỏ hàng của bạn đang trống"
        text="Chọn vài chai nước hoa ưng ý và thêm vào giỏ để bắt đầu."
        to="/"
        action="Tiếp tục mua sắm"
      />
    );
  } else {
    content = (
      <section className="cart" aria-labelledby="cart-title">
        <header className="cart__head">
          <h1 id="cart-title" className="cart__title">
            Giỏ hàng <span>({tongSoLuong} sản phẩm)</span>
          </h1>
        </header>

        <div className="cart__body">
          <ul className="cart__list">
            {items.map((item) => (
              <CartRow key={item._id} item={item} busy={busyId === item._id} onQty={handleQty} onRemove={handleRemove} />
            ))}
          </ul>

          <aside className="cart__summary" aria-label="Tóm tắt đơn hàng">
            <div className="cart__sum-row">
              <span>Tạm tính:</span>
              <strong>{formatVnd(tamTinh)}</strong>
            </div>
            <div className="cart__sum-row cart__sum-row--total">
              <span>Thành tiền:</span>
              <strong>{formatVnd(tamTinh)}</strong>
            </div>

            {message && (
              <p className="cart__msg" role="alert">
                {message}
              </p>
            )}

            <button type="button" className="cart__btn cart__btn--primary" disabled={hasProblem} onClick={handleBuyNow}>
              Mua ngay
            </button>
            <Link to="/" className="cart__btn cart__btn--ghost">
              Tiếp tục mua hàng
            </Link>
          </aside>
        </div>
      </section>
    );
  }

  return <SiteLayout crumb="Giỏ hàng">{content}</SiteLayout>;
}

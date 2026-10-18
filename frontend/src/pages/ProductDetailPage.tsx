import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, Sparkles } from 'lucide-react';
import SiteLayout from '../components/SiteLayout';
import ProductCard, { BottlePlaceholder } from '../components/shop/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useWishlistToggle } from '../hooks/useWishlistToggle';
import { formatVnd } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { GIOI_TINH_LABEL, NHOM_HUONG_OPTIONS, variantLabel } from '../lib/productOptions';
import { useCartStore } from '../store/cartStore';
import { shopService } from '../services/shopService';
import type { ProductDetailData, ProductVariantView } from '../types/shop';
import '../components/shop/ProductCard.css';
import './ProductDetailPage.css';

const MAX_QTY = 10;
const LOGIN_REQUIRED = 'Vui lòng đăng nhập để sử dụng chức năng này.';

const NHOM_HUONG_LABEL: Record<string, string> = Object.fromEntries(
  NHOM_HUONG_OPTIONS.map((o) => [o.value, o.label]),
);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Thư viện ảnh: dải ảnh nhỏ bên trái + ảnh lớn ----------
function Gallery({ product }: { product: ProductDetailData }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const images = product.HinhAnh.filter((h) => !failed.has(h._id));
  const current = images[Math.min(active, images.length - 1)];
  const markFailed = (id: string) => setFailed((prev) => new Set(prev).add(id));

  return (
    <div className="pd-gallery">
      {images.length > 1 && (
        <div className="pd-thumbs" role="tablist" aria-label="Ảnh sản phẩm">
          {images.map((h, i) => (
            <button
              key={h._id}
              type="button"
              role="tab"
              aria-selected={current?._id === h._id}
              aria-label={`Ảnh ${i + 1}`}
              className={current?._id === h._id ? 'pd-thumb is-active' : 'pd-thumb'}
              onClick={() => setActive(i)}
            >
              <img src={h.DuongDan} alt="" loading="lazy" onError={() => markFailed(h._id)} />
            </button>
          ))}
        </div>
      )}
      <div className="pd-stage">
        {current ? (
          <img src={current.DuongDan} alt={product.TenSP} onError={() => markFailed(current._id)} />
        ) : (
          <BottlePlaceholder />
        )}
      </div>
    </div>
  );
}

// ---------- Tháp hương ----------
function Pyramid({ notes }: { notes: ProductDetailData['NotHuong'] }) {
  const tiers = [
    { title: 'Hương đầu', list: notes.Dau },
    { title: 'Hương giữa', list: notes.Giua },
    { title: 'Hương cuối', list: notes.Cuoi },
  ].filter((t) => t.list.length > 0);
  if (tiers.length === 0) return null;

  return (
    <section className="pd-pyramid" aria-labelledby="pd-pyramid-title">
      <h2 id="pd-pyramid-title" className="pd-pyramid__title">
        Tháp hương (Fragrance Pyramid)
      </h2>
      <div className="pd-pyramid__tiers">
        {tiers.map((t) => (
          <div key={t.title} className="pd-tier">
            <p className="pd-tier__name">{t.title}</p>
            <p className="pd-tier__notes">{capitalize(t.list.join(', '))}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Khối mua hàng: dung tích, số lượng, giỏ hàng, yêu thích ----------
function BuyBox({ product }: { product: ProductDetailData }) {
  const { role } = useAuth();
  const variants = product.BienThe;
  const firstInStock = variants.find((v) => v.ConHang) ?? variants[0];
  const [variantId, setVariantId] = useState<string | undefined>(firstInStock?._id);
  const [qty, setQty] = useState(1);
  const { liked, busy: likeBusy, toggle: toggleLike } = useWishlistToggle(product._id);
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore((state) => state.add);

  const selected: ProductVariantView | undefined = variants.find((v) => v._id === variantId);
  const maxQty = selected ? Math.max(1, Math.min(MAX_QTY, selected.SoLuongCo)) : 1;
  const canBuy = Boolean(selected?.ConHang);

  const pick = (v: ProductVariantView) => {
    setVariantId(v._id);
    setQty((q) => Math.min(q, Math.max(1, Math.min(MAX_QTY, v.SoLuongCo))));
    setNotice('');
  };

  const addToCart = async () => {
    if (!selected || !canBuy || adding) return;
    if (!role) {
      setNotice(LOGIN_REQUIRED);
      return;
    }
    if (role !== 'customer') {
      setNotice('Tài khoản quản trị không dùng được giỏ hàng. Hãy đăng nhập bằng tài khoản khách hàng.');
      return;
    }
    setAdding(true);
    try {
      await addItem(selected._id, qty);
      setNotice(`Đã thêm ${qty} × ${product.TenSP} (${selected.TenDungTich}) vào giỏ hàng.`);
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  if (variants.length === 0) {
    return <p className="pd-stock">Sản phẩm hiện chưa có dung tích để bán.</p>;
  }

  return (
    <>
      <p className="pd-price" aria-live="polite">
        {selected ? formatVnd(selected.Gia) : ''}
      </p>

      <fieldset className="pd-field">
        <legend className="pd-label">Chọn dung tích</legend>
        <div className="pd-chips">
          {variants.map((v) => (
            <button
              key={v._id}
              type="button"
              className={v._id === variantId ? 'pd-chip is-active' : 'pd-chip'}
              aria-pressed={v._id === variantId}
              disabled={!v.ConHang}
              onClick={() => pick(v)}
            >
              {variantLabel(v.TenDungTich)}
            </button>
          ))}
        </div>
        {selected && (
          <p className={canBuy ? 'pd-stock' : 'pd-stock pd-stock--out'}>
            {canBuy ? `Còn hàng: ${selected.SoLuongCo} sản phẩm` : 'Tạm hết hàng'}
          </p>
        )}
      </fieldset>

      <div className="pd-actions">
        <div className="pd-qty" role="group" aria-label="Số lượng">
          <button
            type="button"
            aria-label="Giảm số lượng"
            disabled={!canBuy || qty <= 1}
            onClick={() => setQty((q) => q - 1)}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <output aria-live="polite">{qty}</output>
          <button
            type="button"
            aria-label="Tăng số lượng"
            disabled={!canBuy || qty >= maxQty}
            onClick={() => setQty((q) => q + 1)}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <button type="button" className="pd-btn pd-btn--primary" disabled={!canBuy || adding} onClick={addToCart}>
          <ShoppingCart size={18} aria-hidden="true" />
          Thêm vào giỏ hàng
        </button>

        <button type="button" className="pd-btn pd-btn--ghost" aria-pressed={liked} disabled={likeBusy} onClick={() => void toggleLike()}>
          <Heart size={18} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} />
          Yêu thích
        </button>
      </div>

      <p className="pd-notice" role="status">
        {notice}
        {notice.startsWith('Đã thêm') && (
          <>
            {' '}
            <Link to="/gio-hang">Xem giỏ hàng</Link>
          </>
        )}
        {notice === LOGIN_REQUIRED && (
          <>
            {' '}
            <Link to="/login">Đăng nhập</Link>
          </>
        )}
      </p>
    </>
  );
}

// ---------- Nội dung trang ----------
function ProductDetailView({ product }: { product: ProductDetailData }) {
  const loadRelated = useCallback(() => shopService.getRelated(product), [product]);
  const related = useAsyncData(loadRelated);
  const [aiNote, setAiNote] = useState(false);

  const tags = [
    GIOI_TINH_LABEL[product.GioiTinh],
    ...product.NhomHuong.map((n) => `Nhóm hương ${NHOM_HUONG_LABEL[n] ?? n}`),
    product.XuatXu && `Xuất xứ ${product.XuatXu}`,
  ].filter(Boolean);

  return (
    <>
      <div className="pd">
        <Gallery product={product} />

        <div className="pd-info">
          {product.ThuongHieu && <p className="pd-brand">{product.ThuongHieu.TenTH}</p>}
          <h1 className="pd-title">{product.TenSP}</h1>
          <p className="pd-meta">{tags.join(' · ')}</p>

          <BuyBox product={product} />

          <Pyramid notes={product.NotHuong} />

          {(product.MoTa || product.ThongTinChiTiet) && (
            <section className="pd-desc">
              {product.MoTa && <p className="pd-desc__lead">{product.MoTa}</p>}
              {product.ThongTinChiTiet && <p>{product.ThongTinChiTiet}</p>}
            </section>
          )}

          <button type="button" className="pd-ai" onClick={() => setAiNote(true)}>
            <Sparkles size={16} aria-hidden="true" />
            Hỏi AI: Mùi này có hợp với tôi không?
          </button>
          {aiNote && (
            <p className="pd-notice" role="status">
              Trợ lý AI tư vấn mùi hương sẽ sớm ra mắt.
            </p>
          )}
        </div>
      </div>

      <div className="pd-lower">
        <section className="pd-block" aria-labelledby="pd-reviews">
          <h2 id="pd-reviews" className="pd-block__title">
            Đánh giá từ khách hàng
          </h2>
          {/* Backend chưa có model / API đánh giá nên hiện trạng thái trống */}
          <p className="pd-empty">Chưa có đánh giá nào cho sản phẩm này.</p>
        </section>

        <section className="pd-block" aria-labelledby="pd-related">
          <h2 id="pd-related" className="pd-block__title">
            Sản phẩm tương tự
          </h2>
          {related.error ? (
            <p className="pd-empty" role="alert">
              {related.error}{' '}
              <button type="button" className="pd-link" onClick={related.reload}>
                Thử lại
              </button>
            </p>
          ) : related.loading && !related.data ? (
            <div className="pd-related">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="pcard pcard--skeleton" />
              ))}
            </div>
          ) : related.data && related.data.length > 0 ? (
            <div className="pd-related">
              {related.data.map((p, i) => (
                <ProductCard key={p._id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <p className="pd-empty">Chưa có sản phẩm tương tự.</p>
          )}
        </section>
      </div>
    </>
  );
}

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const load = useCallback(() => shopService.getProduct(id), [id]);
  const { data, loading, error, reload } = useAsyncData(load);

  const trail = data?.DanhMuc
    ? [{ label: data.DanhMuc.TenDM, to: `/nuoc-hoa?danhmuc=${data.DanhMuc._id}` }]
    : [{ label: 'Nước hoa', to: '/nuoc-hoa' }];

  return (
    <SiteLayout crumb={data?.TenSP ?? 'Chi tiết sản phẩm'} trail={trail}>
      {error ? (
        <div className="pd-state" role="alert">
          <p>{error}</p>
          <button type="button" className="pd-link" onClick={reload}>
            Thử lại
          </button>
          <Link to="/" className="pd-link">
            Về trang chủ
          </Link>
        </div>
      ) : loading && !data ? (
        <div className="pd" aria-busy="true">
          <div className="pd-skel pd-skel--img" />
          <div className="pd-info">
            <div className="pd-skel pd-skel--line" />
            <div className="pd-skel pd-skel--title" />
            <div className="pd-skel pd-skel--line" />
          </div>
        </div>
      ) : data ? (
        // key theo id: đổi sang sản phẩm khác thì reset dung tích / số lượng
        <ProductDetailView key={data._id} product={data} />
      ) : null}
    </SiteLayout>
  );
}
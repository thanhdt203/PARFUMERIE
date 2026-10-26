import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { formatVnd } from '../../lib/format';
import { useCartStore } from '../../store/cartStore';
import { toast } from '../../store/toastStore';
import type { AiProduct } from '../../types/ai';
import { BottlePlaceholder } from '../shop/ProductCard';
import '../shop/ProductCard.css';
import './AiProductCard.css';

/** Thẻ nước hoa AI gợi ý: ảnh, tên · nồng độ, mùi chính, độ phù hợp, chọn dung tích, Chi tiết / + Giỏ */
export default function AiProductCard({ product }: { product: AiProduct }) {
  const { role } = useAuth();
  const addItem = useCartStore((s) => s.add);
  const variants = product.BienThe;

  // mặc định chọn dung tích rẻ nhất còn hàng
  const [variantId, setVariantId] = useState<string | undefined>(
    () => [...variants].filter((v) => v.ConHang).sort((a, b) => a.Gia - b.Gia)[0]?._id ?? variants[0]?._id,
  );
  const [imgFailed, setImgFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  const selected = variants.find((v) => v._id === variantId);
  const canBuy = Boolean(selected?.ConHang);

  const addToCart = async () => {
    if (!selected || !canBuy || adding) return;
    if (!role) {
      toast.info('Vui lòng đăng nhập để thêm vào giỏ hàng.');
      return;
    }
    if (role !== 'customer') {
      toast.info('Tài khoản quản trị không dùng được giỏ hàng.');
      return;
    }
    setAdding(true);
    try {
      await addItem(selected._id, 1);
      toast.success(`Đã thêm ${product.TenSP} (${selected.TenDungTich}) vào giỏ hàng.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="aip">
      <div className="aip__media">
        {product.AnhChinh && !imgFailed ? (
          <img src={product.AnhChinh} alt={product.TenSP} loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <BottlePlaceholder />
        )}
      </div>

      <h3 className="aip__name">
        {product.TenSP}
        {product.NongDo && ` · ${product.NongDo}`}
      </h3>
      {product.MoTaHuong.length > 0 && <p className="aip__notes">{product.MoTaHuong.join(' · ')}</p>}
      {product.DoPhuHop !== undefined && (
        <p className="aip__match">
          Độ phù hợp: <strong>{product.DoPhuHop}%</strong>
        </p>
      )}

      {variants.length > 0 ? (
        <div className="aip__buy">
          <select
            className="aip__select"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            aria-label={`Chọn dung tích ${product.TenSP}`}
          >
            {variants.map((v) => (
              <option key={v._id} value={v._id} disabled={!v.ConHang}>
                {v.TenDungTich}
                {v.ConHang ? '' : ' (hết)'}
              </option>
            ))}
          </select>
          <span className="aip__price">{selected ? formatVnd(selected.Gia) : ''}</span>
        </div>
      ) : (
        <p className="aip__notes">Chưa có dung tích để bán.</p>
      )}

      <div className="aip__actions">
        <Link to={`/nuoc-hoa/${product._id}`} className="aip__btn">
          Chi tiết
        </Link>
        <button type="button" className="aip__btn aip__btn--primary" disabled={!canBuy || adding} onClick={() => void addToCart()}>
          + Giỏ
        </button>
      </div>
    </article>
  );
}

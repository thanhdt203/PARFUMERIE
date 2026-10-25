import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { formatVnd } from '../../lib/format';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import type { AiProductCardData } from '../../types/shop';
import ProductCard from '../shop/ProductCard';
import './AiAdvisor.css';

const TIERS = [
  ['Đầu', 'Dau'],
  ['Giữa', 'Giua'],
  ['Cuối', 'Cuoi'],
] as const;

/** Thẻ sản phẩm AI gợi ý ở chế độ chuyên sâu: tầng hương + chọn dung tích + thêm vào giỏ ngay trong chat. */
export default function AiProductPick({ product, index }: { product: AiProductCardData; index: number }) {
  const { role } = useAuth();
  const addItem = useCartStore((state) => state.add);
  const pushToast = useToastStore((state) => state.push);
  const variants = product.BienThe ?? [];
  const [variantId, setVariantId] = useState(variants[0]?._id);
  const [adding, setAdding] = useState(false);
  const selected = variants.find((v) => v._id === variantId);

  const add = async () => {
    if (!selected || adding) return;
    setAdding(true);
    try {
      await addItem(selected._id, 1);
      pushToast('success', `Đã thêm ${product.TenSP} (${selected.TenDungTich}) vào giỏ hàng.`);
    } catch (err) {
      pushToast('error', getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="adv__pick">
      <ProductCard product={product} index={index} />
      <div className="adv__extras">
        {product.NotHuong && (
          <dl className="adv__tiers">
            {TIERS.map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{product.NotHuong?.[key].join(', ') || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
        {variants.length === 0 ? (
          <p className="adv__stock">Hiện chưa có dung tích còn hàng.</p>
        ) : (
          <>
            <div className="adv__sizes" role="group" aria-label={`Dung tích ${product.TenSP}`}>
              {variants.map((v) => (
                <button
                  key={v._id}
                  type="button"
                  className={`adv__size${v._id === variantId ? ' is-active' : ''}`}
                  aria-pressed={v._id === variantId}
                  onClick={() => setVariantId(v._id)}
                >
                  {v.TenDungTich} · {formatVnd(v.Gia)}
                </button>
              ))}
            </div>
            {role === 'customer' ? (
              <button type="button" className="adv__add" disabled={adding || !selected} onClick={() => void add()}>
                {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </button>
            ) : (
              <p className="adv__stock">
                <Link to="/login">Đăng nhập tài khoản khách hàng</Link> để thêm vào giỏ.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

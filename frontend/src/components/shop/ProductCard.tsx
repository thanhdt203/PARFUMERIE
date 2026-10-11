import { Heart } from 'lucide-react';
import { formatNumber } from '../../lib/format';
import type { ProductCardData } from '../../types/shop';
import './ProductCard.css';

/** Hình chai mặc định khi sản phẩm chưa có ảnh */
function BottlePlaceholder() {
  return (
    <svg className="pcard__placeholder" viewBox="0 0 120 160" role="img" aria-label="Chưa có ảnh">
      <defs>
        <linearGradient id="pcard-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9c9c9" />
          <stop offset="1" stopColor="#6d6d6d" />
        </linearGradient>
        <linearGradient id="pcard-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8c878" />
          <stop offset="1" stopColor="#a8803a" />
        </linearGradient>
      </defs>
      <rect x="48" y="8" width="24" height="26" rx="3" fill="url(#pcard-gold)" />
      <rect x="54" y="34" width="12" height="10" fill="#b9975a" />
      <rect x="22" y="44" width="76" height="106" rx="10" fill="url(#pcard-glass)" />
      <rect x="40" y="86" width="40" height="26" fill="url(#pcard-gold)" />
    </svg>
  );
}

function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatNumber(min);
  return `${formatNumber(min)} – ${formatNumber(max)}`;
}

/** Ô hiển thị một loại nước hoa: ảnh, thương hiệu, tên, khoảng giá. Chỉ để xem, không có thao tác. */
export default function ProductCard({ product }: { product: ProductCardData }) {
  const { TenSP, TenThuongHieu, AnhChinh, GiaThapNhat, GiaCaoNhat } = product;
  return (
    <article className="pcard">
      <Heart className="pcard__heart" size={34} strokeWidth={1.6} aria-hidden="true" />

      <div className="pcard__image">
        {AnhChinh ? <img src={AnhChinh} alt={TenSP} loading="lazy" /> : <BottlePlaceholder />}
      </div>

      <p className="pcard__brand">{TenThuongHieu}</p>
      <h3 className="pcard__name">{TenSP}</h3>
      <p className="pcard__price">{formatPriceRange(GiaThapNhat, GiaCaoNhat)}</p>
    </article>
  );
}
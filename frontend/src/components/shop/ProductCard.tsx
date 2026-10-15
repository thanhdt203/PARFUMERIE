import { Heart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { formatNumber } from '../../lib/format';
import type { ProductCardData } from '../../types/shop';
import './ProductCard.css';

/** Hình chai mặc định khi sản phẩm chưa có ảnh (hoặc ảnh bị lỗi) */
export function BottlePlaceholder() {
  return (
    <svg className="pcard__placeholder" viewBox="0 0 120 160" role="img" aria-label="Chưa có ảnh">
      <defs>
        <linearGradient id="pcard-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4e4e4" />
          <stop offset="0.55" stopColor="#a9a9a9" />
          <stop offset="1" stopColor="#6d6d6d" />
        </linearGradient>
        <linearGradient id="pcard-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d58c" />
          <stop offset="1" stopColor="#a8803a" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="153" rx="34" ry="5" fill="rgba(0,0,0,0.12)" />
      <rect x="48" y="8" width="24" height="26" rx="3" fill="url(#pcard-gold)" />
      <rect x="54" y="34" width="12" height="10" fill="#b9975a" />
      <rect x="22" y="44" width="76" height="106" rx="10" fill="url(#pcard-glass)" />
      <rect x="29" y="52" width="7" height="90" rx="3.5" fill="rgba(255,255,255,0.35)" />
      <rect x="40" y="86" width="40" height="26" fill="url(#pcard-gold)" />
    </svg>
  );
}

function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatNumber(min);
  return `${formatNumber(min)} – ${formatNumber(max)}`;
}

interface ProductCardProps {
  product: ProductCardData;
  /** Thứ tự trong hàng, dùng để các thẻ hiện lần lượt thay vì cùng lúc */
  index?: number;
}

/** Ô hiển thị một loại nước hoa: ảnh, thương hiệu, tên, khoảng giá. Bấm vào để xem chi tiết. */
export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { TenSP, TenThuongHieu, AnhChinh, GiaThapNhat, GiaCaoNhat } = product;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(AnhChinh) && !imgFailed;

  return (
    <Link
      to={`/nuoc-hoa/${product._id}`}
      className="pcard"
      style={{ '--i': Math.min(index, 8) } as CSSProperties}
      aria-label={`${TenThuongHieu} ${TenSP}`}
      draggable={false}
    >
      <span className="pcard__heart" aria-hidden="true">
        <Heart size={19} strokeWidth={1.8} />
      </span>

      <div className="pcard__media">
        {showImage ? (
          <img
            src={AnhChinh ?? undefined}
            alt={TenSP}
            loading="lazy"
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <BottlePlaceholder />
        )}
      </div>

      <div className="pcard__body">
        <p className="pcard__brand">{TenThuongHieu}</p>
        <h3 className="pcard__name">{TenSP}</h3>
        <p className="pcard__price">
          {formatNumber(GiaThapNhat)}
          <span className="pcard__cur">₫</span>
        </p>
      </div>
    </Link>
  );
}
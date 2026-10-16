import type { ProductCardData } from '../../types/shop';
import ProductCard from '../shop/ProductCard';
import './ProductGrid.css';

interface ProductGridProps {
  title: string;
  /** undefined = đang tải */
  products?: ProductCardData[];
}

/** Lưới nước hoa (dùng cho kết quả lọc); thẻ giữ nguyên kiểu ProductCard của các hàng cuộn ngang */
export default function ProductGrid({ title, products }: ProductGridProps) {
  return (
    <section className="pgrid">
      <h2 className="pgrid__title">{title}</h2>
      {products && products.length === 0 ? (
        <p className="pgrid__empty">Không có sản phẩm nào phù hợp. Thử bỏ bớt bộ lọc nhé.</p>
      ) : (
        <div className="pgrid__list" aria-busy={!products}>
          {products
            ? products.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)
            : Array.from({ length: 6 }, (_, i) => <div key={i} className="pcard pcard--skeleton" />)}
        </div>
      )}
    </section>
  );
}

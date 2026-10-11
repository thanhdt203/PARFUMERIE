import { ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ProductCardData } from '../../types/shop';
import ProductCard from './ProductCard';
import './ProductRow.css';

/** Thời gian giữa 2 lần tự chạy (ms). Đổi số này để chạy nhanh / chậm hơn. */
const AUTO_SCROLL_MS = 4000;

interface ProductRowProps {
  title: string;
  /** Link của nút "Xem thêm" */
  to: string;
  /** undefined = đang tải (hiện ô xám) */
  products?: ProductCardData[];
  /** Thời gian giữa 2 lần tự chạy; 0 = tắt tự chạy */
  autoScrollMs?: number;
}

/**
 * Một mục: tiêu đề + "Xem thêm" + hàng nước hoa cuộn ngang.
 * Người dùng kéo chuột / vuốt tay để xem; hàng cũng tự chạy sang ô kế tiếp sau mỗi khoảng thời gian.
 */
export default function ProductRow({ title, to, products, autoScrollMs = AUTO_SCROLL_MS }: ProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0 });
  const [dragging, setDragging] = useState(false);

  // trạng thái cho tự chạy (dùng ref để không làm render lại)
  const hovering = useRef(false); // chuột đang đặt trên hàng
  const inView = useRef(true); // hàng đang nằm trong màn hình
  const lastInteract = useRef(0); // lần cuối người dùng chạm / lăn / kéo

  const hasProducts = !!products && products.length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasProducts || autoScrollMs <= 0) return;
    // người dùng bật "giảm chuyển động" thì không tự chạy
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
    });
    observer.observe(el);

    const timer = window.setInterval(() => {
      if (document.hidden || hovering.current || !inView.current) return;
      if (Date.now() - lastInteract.current < autoScrollMs) return; // vừa thao tác xong thì chờ
      if (el.scrollWidth - el.clientWidth <= 4) return; // ít ô, không có gì để cuộn

      const first = el.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = (first?.offsetWidth ?? 220) + gap;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' });
    }, autoScrollMs);

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [hasProducts, autoScrollMs]);

  const markInteract = () => {
    lastInteract.current = Date.now();
  };

  // Điện thoại tự vuốt được; riêng chuột thì tự xử lý kéo-để-cuộn
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    markInteract();
    const el = scrollRef.current;
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    el.scrollLeft = drag.current.startLeft - (e.clientX - drag.current.startX);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    markInteract();
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    drag.current.active = false;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  return (
    <section className="prow">
      <div className="prow__head">
        <h2 className="prow__title">{title}</h2>
        <Link to={to} className="prow__more">
          Xem thêm <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className={dragging ? 'prow__scroll prow__scroll--dragging' : 'prow__scroll'}
        aria-busy={!products}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') hovering.current = true; // rê chuột vào thì tạm dừng
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            hovering.current = false;
            markInteract();
          }
        }}
        onTouchStart={markInteract}
        onWheel={markInteract}
        onDragStart={(e) => e.preventDefault()} // không cho kéo nhầm ảnh / chữ
      >
        {products
          ? products.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)
          : Array.from({ length: 6 }, (_, i) => <div key={i} className="pcard pcard--skeleton" />)}
      </div>
    </section>
  );
}
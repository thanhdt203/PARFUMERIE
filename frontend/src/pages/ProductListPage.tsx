import { useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, SearchX, X } from 'lucide-react';
import FilterSidebar from '../components/home/FilterSidebar';
import ProductCard from '../components/shop/ProductCard';
import SiteLayout from '../components/SiteLayout';
import { useAsyncData } from '../hooks/useAsyncData';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { catalogService } from '../services/catalogService';
import { PAGE_SIZE, productListService } from '../services/productListService';
import type { ProductListParams, ProductSort } from '../services/productListService';
import { shopService } from '../services/shopService';
import type { ProductFilters } from '../types/shop';
import '../components/home/ProductGrid.css';
import './ProductListPage.css';

const BASE_PATH = '/nuoc-hoa';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'moi', label: 'Mới nhất' },
  { value: 'pho_bien', label: 'Xem nhiều nhất' },
  { value: 'gia_tang', label: 'Giá thấp đến cao' },
  { value: 'gia_giam', label: 'Giá cao đến thấp' },
  { value: 'ten', label: 'Tên A – Z' },
];
const isSort = (v: string | null): v is ProductSort => SORTS.some((s) => s.value === v);

// load nằm ngoài component để tham chiếu ổn định (useAsyncData yêu cầu)
const loadCategories = () => catalogService.getDanhMuc();
const loadBrands = () => catalogService.getThuongHieu();
const loadFilterOptions = () => shopService.getFilterOptions();

const toList = (v: string | null) =>
  v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/** Dãy số trang có dấu "…": 1 … 4 5 [6] 7 8 … 20 */
function pageItems(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const pages = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

/**
 * Trang danh sách nước hoa: /nuoc-hoa
 *   ?danhmuc=<id>      từ menu "Nước hoa" (nam / nữ / unisex ...)
 *   ?thuonghieu=<id>   từ menu "Thương hiệu"
 *   &nhomhuong=a,b &giaden=2000000 &sort=gia_tang &page=2   do bộ lọc / sắp xếp / phân trang trên trang này
 * Toàn bộ trạng thái nằm trong URL nên gửi link, bấm Back hay tải lại trang đều giữ nguyên kết quả.
 */
export function ProductListPage() {
  const [params, setParams] = useSearchParams();

  const categories = useAsyncData(loadCategories);
  const brands = useAsyncData(loadBrands);
  const { data: options } = useAsyncData(loadFilterOptions);

  // ---------- đọc điều kiện từ URL ----------
  const danhmucId = params.get('danhmuc');
  const thuonghieuId = toList(params.get('thuonghieu'))[0] ?? null;
  const nhomhuong = useMemo(() => toList(params.get('nhomhuong')), [params]);
  const giadenRaw = Number(params.get('giaden'));
  const giaden = params.get('giaden') && Number.isFinite(giadenRaw) && giadenRaw >= 0 ? giadenRaw : undefined;
  const sortRaw = params.get('sort');
  const sort: ProductSort = isSort(sortRaw) ? sortRaw : 'moi';
  const pageRaw = Number.parseInt(params.get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  // ---------- danh mục đang chọn ----------
  // memo để tham chiếu ổn định (query bên dưới phụ thuộc vào nó)
  const allCats = useMemo(() => categories.data ?? [], [categories.data]);
  const selected = allCats.find((c) => c._id === danhmucId) ?? null;
  // chọn danh mục con -> tab đứng ở danh mục cha
  const rootId = selected ? (selected.MaDanhMucCha ?? selected._id) : null;
  const root = allCats.find((c) => c._id === rootId) ?? null;
  const children = allCats.filter((c) => c.MaDanhMucCha === rootId && rootId !== null);
  // tab: các danh mục gốc, bỏ nhóm "chiết" (nhóm này thuộc menu "Nước hoa chiết")
  const tabs = allCats.filter((c) => !c.MaDanhMucCha && !c.TenDM.normalize('NFC').toLowerCase().includes('chiết'));

  const brand = (brands.data ?? []).find((b) => b._id === thuonghieuId) ?? null;

  // chọn danh mục cha thì lấy cả sản phẩm của các danh mục con
  const danhmucIds = useMemo(() => {
    if (!danhmucId) return [];
    const cat = allCats.find((c) => c._id === danhmucId);
    if (!cat || cat.MaDanhMucCha) return [danhmucId];
    return [danhmucId, ...allCats.filter((c) => c.MaDanhMucCha === danhmucId).map((c) => c._id)];
  }, [danhmucId, allCats]);

  // có ?danhmuc thì phải chờ danh sách danh mục (để biết danh mục con) rồi mới gọi API
  const ready = !danhmucId || categories.data !== null || categories.error !== null;

  const query = useMemo<ProductListParams & { ready: boolean }>(
    () => ({ danhmuc: danhmucIds, thuonghieu: thuonghieuId ? [thuonghieuId] : [], nhomhuong, giaden, sort, page, ready }),
    [danhmucIds, thuonghieuId, nhomhuong, giaden, sort, page, ready],
  );
  // kéo thanh giá liên tục chỉ gọi API khi dừng tay
  const debounced = useDebouncedValue(query, 250);
  const pending = debounced !== query;

  const load = useCallback(() => (debounced.ready ? productListService.list(debounced) : Promise.resolve(null)), [debounced]);
  const list = useAsyncData(load);
  const result = list.data;
  const showSkeleton = !ready || (!result && !list.error);

  // ---------- ghi điều kiện lên URL ----------
  const buildQuery = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete('page');
    const qs = next.toString();
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  };
  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const filters: ProductFilters = { gioitinh: [], nhomhuong, giaden };
  const filterActive = nhomhuong.length > 0 || giaden !== undefined;
  const onFilterChange = (f: ProductFilters) =>
    update({ nhomhuong: f.nhomhuong.join(',') || undefined, giaden: f.giaden === undefined ? undefined : String(f.giaden) });
  const onFilterReset = () => update({ nhomhuong: undefined, giaden: undefined });

  // đổi điều kiện (trừ khi chỉ đổi trang) thì về đầu danh sách
  const goToPage = (n: number) => {
    update({ page: n > 1 ? String(n) : undefined }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const totalPages = result?.totalPages ?? 0;
  // lỡ gõ ?page=99 vượt quá số trang
  useEffect(() => {
    if (result && result.items.length === 0 && result.total > 0 && page > totalPages) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }
  }, [result, page, totalPages, setParams]);

  // ---------- chữ hiển thị ----------
  const title = selected?.TenDM ?? brand?.TenTH ?? 'Nước hoa';
  const description =
    selected?.MoTa || brand?.MoTa || 'Bộ sưu tập nước hoa chính hãng, từ hương tươi mát hằng ngày đến hương nồng ấm cho buổi tối.';
  const trail = title === 'Nước hoa' ? undefined : [{ label: 'Nước hoa', to: BASE_PATH }];

  return (
    <SiteLayout crumb={title} trail={trail}>
      <header className="plist__hero">
        <p className="plist__eyebrow">{brand ? 'Thương hiệu' : 'Bộ sưu tập'}</p>
        <h1 className="plist__title">{title}</h1>
        <p className="plist__desc">{description}</p>

        {tabs.length > 0 && (
          <nav className="plist__tabs" aria-label="Danh mục nước hoa">
            <Link to={buildQuery({ danhmuc: undefined })} className={!rootId ? 'plist__tab is-active' : 'plist__tab'} aria-current={!rootId ? 'page' : undefined}>
              Tất cả
            </Link>
            {tabs.map((c) => (
              <Link
                key={c._id}
                to={buildQuery({ danhmuc: c._id })}
                className={c._id === rootId ? 'plist__tab is-active' : 'plist__tab'}
                aria-current={c._id === rootId ? 'page' : undefined}
              >
                {c.TenDM}
              </Link>
            ))}
          </nav>
        )}

        {children.length > 0 && root && (
          <nav className="plist__subtabs" aria-label={`Loại ${root.TenDM.toLowerCase()}`}>
            <Link to={buildQuery({ danhmuc: root._id })} className={danhmucId === root._id ? 'plist__chip is-active' : 'plist__chip'}>
              Tất cả {root.TenDM.toLowerCase()}
            </Link>
            {children.map((c) => (
              <Link key={c._id} to={buildQuery({ danhmuc: c._id })} className={danhmucId === c._id ? 'plist__chip is-active' : 'plist__chip'}>
                {c.TenDM}
              </Link>
            ))}
          </nav>
        )}

        {brand && (
          <div className="plist__subtabs">
            <button type="button" className="plist__chip is-active plist__chip--remove" onClick={() => update({ thuonghieu: undefined })}>
              {brand.TenTH}
              <X size={13} strokeWidth={2.5} aria-hidden="true" />
              <span className="plist__sr">Bỏ lọc thương hiệu</span>
            </button>
          </div>
        )}
      </header>

      <div className="plist__layout">
        <FilterSidebar options={options} value={filters} onChange={onFilterChange} onReset={onFilterReset} active={filterActive} hideGender />

        <section className="plist__main" aria-label="Danh sách sản phẩm">
          <div className="plist__toolbar">
            <p className="plist__count" aria-live="polite">
              {result ? `${result.total} sản phẩm` : '\u00a0'}
            </p>
            <label className="plist__sort">
              <span>Sắp xếp</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value === 'moi' ? undefined : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {list.error && !result ? (
            <p className="plist__msg plist__msg--error" role="alert">
              {list.error}
              <button type="button" onClick={list.reload}>
                Thử lại
              </button>
            </p>
          ) : showSkeleton ? (
            <div className="pgrid__list" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="pcard pcard--skeleton" />
              ))}
            </div>
          ) : result && result.items.length === 0 ? (
            <div className="plist__empty">
              <SearchX size={40} strokeWidth={1.25} aria-hidden="true" />
              <h2>Chưa có sản phẩm phù hợp</h2>
              <p>{filterActive ? 'Thử bỏ bớt bộ lọc để xem thêm nước hoa.' : 'Danh mục này hiện chưa có sản phẩm còn hàng.'}</p>
              {filterActive ? (
                <button type="button" className="plist__btn" onClick={onFilterReset}>
                  Xóa bộ lọc
                </button>
              ) : (
                <Link to={BASE_PATH} className="plist__btn">
                  Xem tất cả nước hoa
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className={pending || list.loading ? 'pgrid__list plist__grid is-pending' : 'pgrid__list plist__grid'} aria-busy={pending || list.loading}>
                {result?.items.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)}
              </div>

              {totalPages > 1 && (
                <nav className="plist__pager" aria-label="Phân trang">
                  <button type="button" className="plist__page" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Trang trước">
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  {pageItems(page, totalPages).map((n, i) =>
                    n === '…' ? (
                      <span key={`gap-${i}`} className="plist__gap" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={n === page ? 'plist__page is-active' : 'plist__page'}
                        aria-current={n === page ? 'page' : undefined}
                        onClick={() => goToPage(n)}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <button type="button" className="plist__page" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} aria-label="Trang sau">
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
              <p className="plist__range">
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + (result?.items.length ?? 0)} / {result?.total}
              </p>
            </>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
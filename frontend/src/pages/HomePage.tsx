import { useCallback, useState } from 'react';
import AiAdvisor from '../components/home/AiAdvisor';
import FilterSidebar from '../components/home/FilterSidebar';
import ProductGrid from '../components/home/ProductGrid';
import ProductRow from '../components/shop/ProductRow';
import SiteLayout from '../components/SiteLayout';
import { useAsyncData } from '../hooks/useAsyncData';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { shopService } from '../services/shopService';
import type { ProductFilters } from '../types/shop';
import '../components/shop/ProductRow.css';
import './HomePage.css';

// load nằm ngoài component để tham chiếu ổn định (useAsyncData yêu cầu)
const loadSections = () => shopService.getSections();
const loadFilterOptions = () => shopService.getFilterOptions();

const NO_FILTER: ProductFilters = { gioitinh: [], nhomhuong: [] };
const isActive = (f: ProductFilters) => f.gioitinh.length > 0 || f.nhomhuong.length > 0 || f.giaden !== undefined;

export function HomePage() {
  const { data, loading, error, reload } = useAsyncData(loadSections);
  const { data: options } = useAsyncData(loadFilterOptions);

  const [filters, setFilters] = useState<ProductFilters>(NO_FILTER);
  // chờ người dùng ngừng chọn / kéo thanh giá rồi mới gọi API
  const debounced = useDebouncedValue(filters, 350);
  const active = isActive(filters);

  // chưa bật bộ lọc nào thì không gọi API
  const loadFiltered = useCallback(
    () => (isActive(debounced) ? shopService.searchProducts(debounced) : Promise.resolve([])),
    [debounced],
  );
  const filtered = useAsyncData(loadFiltered);

  return (
    <SiteLayout crumb="Nước hoa">
      <AiAdvisor />

      <div className="home">
        <FilterSidebar
          options={options}
          value={filters}
          onChange={setFilters}
          onReset={() => setFilters(NO_FILTER)}
          active={active}
        />

        <div className="home__main">
          {active ? (
            <ProductGrid
              title={filtered.data ? `Kết quả lọc (${filtered.data.length})` : 'Kết quả lọc'}
              products={filtered.loading ? undefined : (filtered.data ?? undefined)}
            />
          ) : error ? (
            <p className="pgrid-msg pgrid-msg--error" role="alert">
              {error}
              <button type="button" onClick={reload}>Thử lại</button>
            </p>
          ) : loading && !data ? (
            <>
              <ProductRow title="Top tìm kiếm" to="/nuoc-hoa" />
              <ProductRow title="Sản phẩm mới" to="/nuoc-hoa" />
            </>
          ) : (
            data
              ?.filter((s) => s.products.length > 0)
              .map((s) => <ProductRow key={s.key} title={s.title} to={s.to} products={s.products} />)
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
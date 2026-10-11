import ProductRow from '../components/shop/ProductRow';
import SiteLayout from '../components/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { shopService } from '../services/shopService';
import '../components/shop/ProductRow.css';

// load nằm ngoài component để tham chiếu ổn định (useAsyncData yêu cầu)
const loadSections = () => shopService.getSections();

export function HomePage() {
  const { role, signOut } = useAuth();
  const canManage = role === 'staff' || role === 'admin';
  const { data, loading, error, reload } = useAsyncData(loadSections);

  return (
    <SiteLayout crumb="Nước hoa">
      {error ? (
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
    </SiteLayout>
  );
}
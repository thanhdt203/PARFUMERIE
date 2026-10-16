import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleRoute from './components/RoleRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/CustomerPages';
import { CartPage } from './pages/CartPage';
import CartSync from './components/CartSync';
import ComingSoonPage from './pages/admin/ComingSoonPage';

// Tách Dashboard (kéo theo Recharts) thành chunk riêng để trang khách tải nhẹ
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const ThuongHieuPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.ThuongHieuPage })));
const DanhMucPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.DanhMucPage })));
const DungTichPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.DungTichPage })));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));

function App() {
  return (
    <>
    <CartSync />
    <Routes>
      {/* ai cũng vào được (kể cả chưa đăng nhập) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/nuoc-hoa/:id" element={<ProductDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/gio-hang" element={<CartPage />} />
      <Route path="/yeu-thich" element={<WishlistPage />} />

      {/* đường dẫn cũ của nhân viên -> chuyển sang khu quản trị chung */}
      <Route path="/staff" element={<Navigate to="/admin" replace />} />

      {/* khu quản trị: nhân viên và admin */}
      <Route element={<RoleRoute allow={['staff', 'admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="san-pham" element={<ProductsPage />} />
          <Route path="danh-muc" element={<DanhMucPage />} />
          <Route path="thuong-hieu" element={<ThuongHieuPage />} />
          <Route path="dung-tich" element={<DungTichPage />} />
          <Route path="kho" element={<ComingSoonPage />} />
          <Route path="voucher" element={<ComingSoonPage />} />
          <Route path="don-hang" element={<OrdersPage />} />
          <Route path="khach-hang" element={<ComingSoonPage />} />
          <Route path="bao-cao" element={<ComingSoonPage />} />

          {/* chỉ admin: staff gõ URL trực tiếp sẽ bị đưa về /admin */}
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="nguoi-dung" element={<ComingSoonPage />} />
            <Route path="tri-thuc-ai" element={<ComingSoonPage />} />
            <Route path="cai-dat" element={<ComingSoonPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
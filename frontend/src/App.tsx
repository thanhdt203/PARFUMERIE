import { Routes, Route, Navigate } from 'react-router-dom';
import RoleRoute from './components/RoleRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { HomePage, StaffPage, AdminPage } from './pages/DemoPages';

function App() {
  return (
    <Routes>
      {/* ai cũng vào được (kể cả chưa đăng nhập) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* nhân viên và admin */}
      <Route element={<RoleRoute allow={['staff', 'admin']} />}>
        <Route path="/staff" element={<StaffPage />} />
      </Route>

      {/* chỉ admin */}
      <Route element={<RoleRoute allow={['admin']} />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

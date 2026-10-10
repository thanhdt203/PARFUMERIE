import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';

export default function RoleRoute({ allow }: { allow: Role[] }) {
  const { role, loading } = useAuth();

  if (loading) return <p>Đang tải...</p>;
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to={ROLE_HOME[role]} replace />;
  return <Outlet />;
}

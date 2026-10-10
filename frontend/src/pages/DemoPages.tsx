import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LogoutButton() {
  const { signOut } = useAuth();
  return <button onClick={signOut}>Đăng xuất</button>;
}

export function HomePage() {
  const { role } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <h2>Giao diện KHÁCH (trang chủ)</h2>
      {role ? <LogoutButton /> : <Link to="/login">Đăng nhập</Link>}
    </div>
  );
}

export function StaffPage() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Giao diện NHÂN VIÊN</h2>
      <LogoutButton />
    </div>
  );
}

export function AdminPage() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Giao diện ADMIN</h2>
      <LogoutButton />
    </div>
  );
}

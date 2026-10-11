import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LogoutButton() {
  const { signOut } = useAuth();
  return <button onClick={signOut}>Đăng xuất</button>;
}

export function HomePage() {
  const { role } = useAuth();
  const canManage = role === 'staff' || role === 'admin';
  return (
    <div style={{ padding: 24 }}>
      <h2>Giao diện KHÁCH (trang chủ)</h2>
      {role ? (
        <>
          {canManage && (
            <p>
              <Link to="/admin">Vào trang quản trị</Link>
            </p>
          )}
          <LogoutButton />
        </>
      ) : (
        <Link to="/login">Đăng nhập</Link>
      )}
    </div>
  );
}

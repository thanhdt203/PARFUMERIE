import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import SiteLayout from '../components/SiteLayout';
import AuthCard, { Field } from '../components/AuthCard';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import { getErrorMessage } from '../lib/errors';

export default function LoginPage() {
  const { role, loading, signIn } = useAuth();
  const location = useLocation();
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered;

  const [taiKhoan, setTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // đã đăng nhập (vừa đăng nhập xong, hoặc F5 ở /login) -> vào giao diện theo vai trò
  if (!loading && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taiKhoan.trim() || !matKhau) {
      setError('Nhập email và mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(taiKhoan.trim(), matKhau);
      // signIn cập nhật role -> đoạn <Navigate> phía trên tự chuyển trang
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout crumb="Đăng nhập">
      <AuthCard title="Đăng nhập" subtitle="Chào mừng bạn quay lại Parfumerie.">
        <form onSubmit={handleSubmit} noValidate>
          <Field
            id="tai-khoan"
            label="Email"
            placeholder="Nhập email"
            autoComplete="username"
            value={taiKhoan}
            onChange={setTaiKhoan}
            invalid={!!error}
            disabled={submitting}
          />
          <Field
            id="mat-khau"
            label="Mật khẩu"
            type="password"
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            value={matKhau}
            onChange={setMatKhau}
            invalid={!!error}
            disabled={submitting}
          />

          <p className="auth-forgot">
            <Link className="auth-link" to="/quen-mat-khau">
              Quên mật khẩu?
            </Link>
          </p>

          {justRegistered && !error && (
            <p className="auth-msg auth-msg--ok" role="status">
              Đăng ký thành công. Đăng nhập để tiếp tục.
            </p>
          )}
          {error && (
            <p className="auth-msg auth-msg--error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-extra">
          Chưa có tài khoản? <Link className="auth-link" to="/register">Đăng ký</Link>
        </p>
      </AuthCard>
    </SiteLayout>
  );
}

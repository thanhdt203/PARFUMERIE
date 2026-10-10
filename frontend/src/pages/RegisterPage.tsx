import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import SiteLayout from '../components/SiteLayout';
import AuthCard, { Field } from '../components/AuthCard';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import api from '../lib/api';
import { getErrorMessage } from '../lib/errors';

type FormState = {
  Ho: string;
  Ten: string;
  Email: string;
  SoDienThoai: string;
  MatKhau: string;
};

const EMPTY: FormState = { Ho: '', Ten: '', Email: '', SoDienThoai: '', MatKhau: '' };

// trả về câu báo lỗi, hoặc chuỗi rỗng nếu hợp lệ
function validate(f: FormState): string {
  if (!f.Ho.trim() || !f.Ten.trim() || !f.Email.trim() || !f.SoDienThoai.trim() || !f.MatKhau) {
    return 'Nhập đầy đủ Họ, Tên, Email, Số điện thoại và Mật khẩu.';
  }
  if (!/^\S+@\S+\.\S+$/.test(f.Email.trim())) return 'Email chưa đúng định dạng.';
  if (!/^0\d{9}$/.test(f.SoDienThoai.trim())) return 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
  if (f.MatKhau.length < 6) return 'Mật khẩu cần ít nhất 6 ký tự.';
  return '';
}

export default function RegisterPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const message = validate(form);
    if (message) {
      setError(message);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/signup', {
        Ho: form.Ho.trim(),
        Ten: form.Ten.trim(),
        Email: form.Email.trim(),
        SoDienThoai: form.SoDienThoai.trim(),
        MatKhau: form.MatKhau,
      });
      navigate('/login', { state: { registered: true }, replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const invalid = !!error;

  return (
    <SiteLayout crumb="Đăng ký tài khoản">
      <AuthCard title="Đăng ký tài khoản" subtitle="Nếu chưa có tài khoản vui lòng đăng ký tại đây">
        <form onSubmit={handleSubmit} noValidate>
          <Field id="ho" label="Họ" autoComplete="family-name" value={form.Ho} onChange={set('Ho')} invalid={invalid} disabled={submitting} />
          <Field id="ten" label="Tên" autoComplete="given-name" value={form.Ten} onChange={set('Ten')} invalid={invalid} disabled={submitting} />
          <Field id="email" label="Email" type="email" inputMode="email" autoComplete="email" value={form.Email} onChange={set('Email')} invalid={invalid} disabled={submitting} />
          <Field id="sdt" label="Số điện thoại" type="tel" inputMode="tel" autoComplete="tel" value={form.SoDienThoai} onChange={set('SoDienThoai')} invalid={invalid} disabled={submitting} />
          <Field id="mat-khau" label="Mật khẩu" type="password" autoComplete="new-password" value={form.MatKhau} onChange={set('MatKhau')} invalid={invalid} disabled={submitting} />

          {error && (
            <p className="auth-msg auth-msg--error" role="alert">
              {error}
            </p>
          )}

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>
            <Link className="auth-link" to="/login">
              Đăng nhập
            </Link>
          </div>
        </form>
      </AuthCard>
    </SiteLayout>
  );
}

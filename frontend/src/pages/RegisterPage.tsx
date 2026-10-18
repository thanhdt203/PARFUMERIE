import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import SiteLayout from '../components/SiteLayout';
import AuthCard, { Field } from '../components/AuthCard';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import api from '../lib/api';
import { getErrorMessage } from '../lib/errors';

// Theo bản thiết kế: Họ và tên · Số điện thoại · Email · Mật khẩu · Nhập lại mật khẩu
type FormState = {
  HoTen: string;
  SoDienThoai: string;
  Email: string;
  MatKhau: string;
  NhapLaiMatKhau: string;
};

const EMPTY: FormState = { HoTen: '', SoDienThoai: '', Email: '', MatKhau: '', NhapLaiMatKhau: '' };

// Backend lưu Họ và Tên riêng: từ cuối cùng là Tên, phần còn lại là Họ ("Nguyễn Văn An" -> "Nguyễn Văn" + "An")
function splitName(hoTen: string): { Ho: string; Ten: string } {
  const words = hoTen.trim().split(/\s+/);
  const Ten = words.pop() ?? '';
  return { Ho: words.join(' '), Ten };
}

// trả về câu báo lỗi, hoặc chuỗi rỗng nếu hợp lệ
function validate(f: FormState): string {
  if (!f.HoTen.trim() || !f.SoDienThoai.trim() || !f.Email.trim() || !f.MatKhau || !f.NhapLaiMatKhau) {
    return 'Nhập đầy đủ Họ và tên, Số điện thoại, Email và Mật khẩu.';
  }
  if (f.HoTen.trim().split(/\s+/).length < 2) return 'Nhập đầy đủ họ và tên (ít nhất 2 từ).';
  if (!/^\S+@\S+\.\S+$/.test(f.Email.trim())) return 'Email chưa đúng định dạng.';
  if (!/^0\d{9}$/.test(f.SoDienThoai.trim())) return 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
  if (f.MatKhau.length < 6) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (f.MatKhau !== f.NhapLaiMatKhau) return 'Mật khẩu nhập lại không khớp.';
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
      const { Ho, Ten } = splitName(form.HoTen);
      await api.post('/auth/signup', {
        Ho,
        Ten,
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
    <SiteLayout crumb="Đăng ký">
      <AuthCard title="Tạo tài khoản" subtitle="Đăng ký để mua sắm và nhận tư vấn mùi hương.">
        <form onSubmit={handleSubmit} noValidate>
          <Field id="ho-ten" label="Họ và tên" placeholder="Nhập họ và tên" autoComplete="name" value={form.HoTen} onChange={set('HoTen')} invalid={invalid} disabled={submitting} />
          <Field id="sdt" label="Số điện thoại" placeholder="Nhập số điện thoại" type="tel" inputMode="tel" autoComplete="tel" value={form.SoDienThoai} onChange={set('SoDienThoai')} invalid={invalid} disabled={submitting} />
          <Field id="email" label="Email" placeholder="Nhập email" type="email" inputMode="email" autoComplete="email" value={form.Email} onChange={set('Email')} invalid={invalid} disabled={submitting} />
          <Field id="mat-khau" label="Mật khẩu" type="password" placeholder="Nhập mật khẩu" autoComplete="new-password" value={form.MatKhau} onChange={set('MatKhau')} invalid={invalid} disabled={submitting} />
          <Field id="nhap-lai-mat-khau" label="Nhập lại mật khẩu" type="password" placeholder="Nhập lại mật khẩu" autoComplete="new-password" value={form.NhapLaiMatKhau} onChange={set('NhapLaiMatKhau')} invalid={invalid} disabled={submitting} />

          {error && (
            <p className="auth-msg auth-msg--error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="auth-extra">
          Đã có tài khoản? <Link className="auth-link" to="/login">Đăng nhập</Link>
        </p>
      </AuthCard>
    </SiteLayout>
  );
}

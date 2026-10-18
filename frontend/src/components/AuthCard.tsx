import { useState } from 'react';
import type { ReactNode } from 'react';
import { Droplets, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import './AuthCard.css';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const PERKS = [
  { icon: ShieldCheck, text: 'Nước hoa chính hãng 100%' },
  { icon: Droplets, text: 'Có nước hoa chiết dùng thử' },
  { icon: Sparkles, text: 'Tư vấn mùi hương bằng AI' },
];

// Khung dùng chung cho đăng nhập / đăng ký:
// bên trái là banner thương hiệu, bên phải là form (theo bản phác thảo)
export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        {/* Muốn dùng ảnh thật: đặt --auth-banner-img: url(...) cho .auth-banner trong AuthCard.css */}
        <aside className="auth-banner" aria-label="Giới thiệu Parfumerie">
          <div className="auth-banner__content">
            <p className="auth-banner__eyebrow">Parfumerie</p>
            <h2 className="auth-banner__title">Magic of your emotions</h2>
            <p className="auth-banner__text">Mỗi mùi hương là một câu chuyện. Để chúng tôi giúp bạn tìm ra câu chuyện của riêng mình.</p>
            <ul className="auth-banner__perks">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel__inner">
            <h1 className="auth-panel__title">{title}</h1>
            <p className="auth-panel__subtitle">{subtitle}</p>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  invalid?: boolean;
  disabled?: boolean;
}

export function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  invalid,
  disabled,
}: FieldProps) {
  const isPassword = type === 'password';
  const [show, setShow] = useState(false);

  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-field__box">
        <input
          id={id}
          className={isPassword ? 'auth-field__input auth-field__input--pw' : 'auth-field__input'}
          type={isPassword && show ? 'text' : type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={invalid ? true : undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-field__eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

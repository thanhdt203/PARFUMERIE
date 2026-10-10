import type { ReactNode } from 'react';
import './AuthCard.css';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

// Khung thẻ dùng chung cho trang đăng nhập và đăng ký
export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <h1 className="auth-card__title">{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>

        {/* Đăng nhập bằng mạng xã hội: backend chưa hỗ trợ nên tạm khóa */}
        <div className="social">
          <button type="button" className="social__btn social__btn--fb" disabled title="Chưa hỗ trợ">
            <span className="social__icon" aria-hidden="true">
              f
            </span>
            <span className="social__label">Facebook</span>
          </button>
          <button type="button" className="social__btn social__btn--gg" disabled title="Chưa hỗ trợ">
            <span className="social__icon" aria-hidden="true">
              G+
            </span>
            <span className="social__label">Google</span>
          </button>
        </div>

        {children}
      </section>
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
  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label}
        <span className="auth-field__req" aria-hidden="true">
          *
        </span>
      </label>
      <input
        id={id}
        className="auth-field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-required="true"
        aria-invalid={invalid ? true : undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Props gắn vào ô nhập để nối nhãn, lỗi và trợ năng */
export interface FieldControlProps {
  id: string;
  invalid: boolean;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Đếm ký tự so với maxlength của model. Vượt quá thì chữ đỏ. */
  counter?: { current: number; max: number };
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Nhãn + ô nhập + lỗi/gợi ý. Ví dụ:
 * <FormField label="Tên thương hiệu" required error={errors.TenTH}>
 *   {(control) => <TextInput {...control} value={v} onChange={...} />}
 * </FormField>
 */
export default function FormField({ label, required, error, hint, counter, children }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error ?? hint);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {counter && (
          <span className={cn('text-xs tabular-nums', counter.current > counter.max ? 'text-danger' : 'text-ink-faint')}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {children({ id, invalid: Boolean(error), 'aria-describedby': hasMessage ? messageId : undefined })}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL_CLASS =
  'w-full rounded-control border bg-surface px-3 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint';

function borderClass(invalid: boolean | undefined): string {
  return invalid ? 'border-danger' : 'border-line';
}

interface ControlExtra {
  invalid?: boolean;
}

export function TextInput({ invalid, className, ...rest }: ComponentProps<'input'> & ControlExtra) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASS, 'h-10', borderClass(invalid), className)}
      {...rest}
    />
  );
}

export function TextArea({ invalid, className, ...rest }: ComponentProps<'textarea'> & ControlExtra) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASS, 'min-h-24 py-2.5', borderClass(invalid), className)}
      {...rest}
    />
  );
}

export function SelectInput({ invalid, className, children, ...rest }: ComponentProps<'select'> & ControlExtra) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASS, 'h-10', borderClass(invalid), className)}
      {...rest}
    >
      {children}
    </select>
  );
}

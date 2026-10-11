import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-muted text-ink-muted',
};

interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
}

export default function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASS[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

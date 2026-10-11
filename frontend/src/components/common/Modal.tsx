import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { cn } from '../../lib/cn';
import { getPortalRoot } from '../../lib/portal';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
  /** Vùng nút ở cuối (Hủy / Lưu...) */
  footer?: ReactNode;
  /** Đang lưu: chặn đóng bằng Esc, bấm nền và nút X */
  busy?: boolean;
}

function ModalPanel({
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  busy = false,
}: Omit<ModalProps, 'open'>) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock();

  // Khi mở: đưa focus vào trong (ưu tiên ô đầu tiên của nội dung), đóng thì trả focus về chỗ cũ
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const body = panel.querySelector<HTMLElement>('[data-modal-body]');
      const target = body?.querySelector<HTMLElement>(FOCUSABLE) ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target.focus();
    }
    return () => previous?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    // giữ Tab xoay vòng trong modal
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-scrim sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'animate-pop-in flex max-h-[92svh] w-full flex-col rounded-t-card bg-surface shadow-pop outline-none sm:max-h-[90svh] sm:rounded-card',
          SIZE_CLASS[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid size-9 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div data-modal-body className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</footer>
        )}
      </div>
    </div>,
    getPortalRoot(),
  );
}

export default function Modal({ open, ...rest }: ModalProps) {
  if (!open) return null;
  return <ModalPanel {...rest} />;
}

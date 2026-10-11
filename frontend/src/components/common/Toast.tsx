import { CircleCheck, CircleX, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useToastStore } from '../../store/toastStore';
import type { ToastTone } from '../../store/toastStore';

const TONE_META: Record<ToastTone, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CircleCheck, iconClass: 'text-success' },
  error: { icon: CircleX, iconClass: 'text-danger' },
  info: { icon: Info, iconClass: 'text-info' },
};

/** Đặt một lần trong AdminLayout. Gọi toast.success(...) từ store để hiện thông báo. */
export default function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map((item) => {
        const { icon: Icon, iconClass } = TONE_META[item.tone];
        return (
          <div
            key={item.id}
            className="animate-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface p-3.5 shadow-pop"
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden="true" />
            <p className="flex-1 text-sm text-ink">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="grid size-6 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
              aria-label="Đóng thông báo"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

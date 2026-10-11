import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatNumber } from '../../lib/format';

interface PaginationProps {
  /** Trang hiện tại, bắt đầu từ 1 */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
}

/** Dãy số trang rút gọn: 1 … 4 5 6 … 20 */
function getPageItems(page: number, totalPages: number): Array<number | 'gap-start' | 'gap-end'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const items: Array<number | 'gap-start' | 'gap-end'> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(totalPages - 1, page + 1);
  if (from > 2) items.push('gap-start');
  for (let p = from; p <= to; p += 1) items.push(p);
  if (to < totalPages - 1) items.push('gap-end');
  items.push(totalPages);
  return items;
}

const NAV_BUTTON_CLASS =
  'grid size-9 place-items-center rounded-control border border-line text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const firstItem = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastItem = Math.min(current * pageSize, total);

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <p>
          Hiển thị {formatNumber(firstItem)}-{formatNumber(lastItem)} trên {formatNumber(total)}
        </p>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="sr-only sm:not-sr-only">Số dòng</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-control border border-line bg-surface px-2 text-sm text-ink"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav aria-label="Phân trang" className="flex items-center gap-1">
        <button
          type="button"
          className={NAV_BUTTON_CLASS}
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        {/* mobile: chỉ hiện "Trang x/y", từ sm trở lên hiện dãy số */}
        <span className="px-3 text-sm text-ink-muted sm:hidden">
          Trang {current}/{totalPages}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          {getPageItems(current, totalPages).map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === current ? 'page' : undefined}
                className={cn(
                  'grid h-9 min-w-9 place-items-center rounded-control px-2 text-sm font-medium tabular-nums transition-colors',
                  item === current ? 'bg-accent text-on-accent' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="px-1 text-ink-faint" aria-hidden="true">
                …
              </span>
            ),
          )}
        </div>

        <button
          type="button"
          className={NAV_BUTTON_CLASS}
          onClick={() => onPageChange(current + 1)}
          disabled={current >= totalPages}
          aria-label="Trang sau"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

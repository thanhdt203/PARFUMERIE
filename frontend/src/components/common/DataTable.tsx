import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Skeleton from './Skeleton';

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

type HideBelow = 'sm' | 'md' | 'lg';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Bấm tiêu đề cột để sắp xếp (cần truyền sort + onSortChange) */
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Ẩn cột dưới breakpoint này để bảng gọn trên màn nhỏ */
  hideBelow?: HideBelow;
  className?: string;
}

interface DataTableProps<T> {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  skeletonRows?: number;
  /** Mô tả bảng cho trình đọc màn hình */
  caption?: string;
  /** Vùng dưới bảng, thường là <Pagination /> */
  footer?: ReactNode;
}

const HIDE_CLASS: Record<HideBelow, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

const ALIGN_CLASS = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  sort = null,
  onSortChange,
  onRowClick,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription,
  emptyAction,
  skeletonRows = 5,
  caption,
  footer,
}: DataTableProps<T>) {
  const cellClass = (column: DataTableColumn<T>) =>
    cn(ALIGN_CLASS[column.align ?? 'left'], column.hideBelow && HIDE_CLASS[column.hideBelow]);

  // Bấm lần lượt: tăng dần -> giảm dần -> bỏ sắp xếp
  const handleSort = (key: string) => {
    if (!onSortChange) return;
    if (sort?.key !== key) onSortChange({ key, direction: 'asc' });
    else if (sort.direction === 'asc') onSortChange({ key, direction: 'desc' });
    else onSortChange(null);
  };

  const handleRowKey = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (onRowClick && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const showSkeleton = loading && rows.length === 0;
  const showError = Boolean(error) && rows.length === 0;
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const ariaSort = !column.sortable
                  ? undefined
                  : active
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none';
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn('px-4 py-3 text-xs font-medium whitespace-nowrap text-ink-muted', cellClass(column))}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md hover:text-ink',
                          active && 'text-ink',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className={cn(loading && rows.length > 0 && 'opacity-60 transition-opacity')}>
            {showSkeleton &&
              Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3.5', cellClass(column))}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}

            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleRowKey(event, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'border-b border-line last:border-0',
                  onRowClick && 'cursor-pointer transition-colors hover:bg-surface-muted',
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3.5 text-ink', cellClass(column), column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showError && error && <ErrorState message={error} onRetry={onRetry} />}
      {showEmpty && <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />}
      {footer && <div className="border-t border-line">{footer}</div>}
    </div>
  );
}

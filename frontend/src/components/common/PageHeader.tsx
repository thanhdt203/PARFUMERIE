import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Tiêu đề trang đã hiện ở thanh trên cùng, chỉ truyền khi cần tiêu đề phụ */
  title?: string;
  description?: ReactNode;
  /** Nút/bộ lọc nằm bên phải (xuống dưới trên mobile) */
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {title && <h2 className="text-2xl font-semibold text-ink">{title}</h2>}
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

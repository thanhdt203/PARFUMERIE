import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { findNavItem } from '../../lib/adminNav';

// Trang tạm cho các module chưa làm. Mỗi giai đoạn sau sẽ thay route tương ứng bằng trang thật.
export default function ComingSoonPage() {
  const { pathname } = useLocation();
  const item = findNavItem(pathname);

  return (
    <div className="grid place-items-center rounded-card border border-dashed border-line bg-surface px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-card bg-accent-soft text-accent">
        {item ? <item.icon className="size-7" aria-hidden="true" /> : <Hammer className="size-7" aria-hidden="true" />}
      </span>
      <h2 className="mt-5 text-xl font-semibold text-ink">{item?.label ?? 'Trang này'} đang được xây dựng</h2>
      {item && <p className="mt-2 max-w-md text-ink-muted">{item.description}</p>}
      {item && <p className="mt-4 text-sm text-ink-faint">Hoàn thiện ở giai đoạn {item.phase}.</p>}
    </div>
  );
}

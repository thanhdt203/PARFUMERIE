import { RefreshCw, TriangleAlert } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="grid place-items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-card bg-danger-soft text-danger">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-medium text-ink">Không tải được dữ liệu</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button className="mt-4" icon={RefreshCw} onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

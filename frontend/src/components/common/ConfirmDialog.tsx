import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  /** Đang xử lý: khóa các nút */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận, dùng cho mọi thao tác xóa. Focus mặc định ở nút Hủy để tránh bấm nhầm. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xóa',
  cancelLabel = 'Hủy',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      busy={loading}
      footer={
        <>
          <Button autoFocus onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {tone === 'danger' && (
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-danger-soft text-danger">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="text-sm text-ink-muted">{message}</div>
      </div>
    </Modal>
  );
}

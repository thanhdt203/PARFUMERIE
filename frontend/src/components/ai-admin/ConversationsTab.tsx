import { useCallback, useEffect, useState } from 'react';
import Button from '../common/Button';
import DataTable from '../common/DataTable';
import type { DataTableColumn } from '../common/DataTable';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';
import Skeleton from '../common/Skeleton';
import { useAsyncData } from '../../hooks/useAsyncData';
import { cn } from '../../lib/cn';
import { getErrorMessage } from '../../lib/errors';
import { aiAdminService } from '../../services/aiAdminService';
import { toast } from '../../store/toastStore';
import type { AdminConversation, AdminConversationRow, CustomerBrief } from '../../types/aiAdmin';

const PAGE_SIZES = [12, 24, 48] as const;

const customerName = (customer?: CustomerBrief | null) =>
  [customer?.Ho, customer?.Ten].filter(Boolean).join(' ') || 'Khách đã xóa';

function ConversationModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [conversation, setConversation] = useState<AdminConversation | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    aiAdminService
      .getConversation(id)
      .then((data) => !cancelled && setConversation(data))
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed(true);
        toast.error(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={conversation?.TieuDe ?? 'Cuộc trò chuyện'}
      description={conversation ? `${customerName(conversation.KhachHang)} · ${conversation.KhachHang?.Email ?? ''}` : undefined}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      {failed ? (
        <p className="text-sm text-ink-muted">Không tải được cuộc trò chuyện.</p>
      ) : !conversation ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ol className="space-y-3">
          {conversation.messages.map((message, index) => (
            <li key={index} className={cn('flex flex-col gap-1', message.role === 'user' ? 'items-end' : 'items-start')}>
              <p
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-card px-3 py-2 text-sm',
                  message.role === 'user' ? 'bg-accent text-on-accent' : 'bg-surface-muted text-ink',
                )}
              >
                {message.text}
              </p>
              {message.products.length > 0 && (
                <p className="text-xs text-ink-muted">Đã gợi ý: {message.products.join(', ')}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

export default function ConversationsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(() => aiAdminService.listConversations(page, pageSize), [page, pageSize]);
  const { data, loading, error, reload } = useAsyncData(load);

  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const columns: ReadonlyArray<DataTableColumn<AdminConversationRow>> = [
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{customerName(row.KhachHang)}</p>
          <p className="text-xs text-ink-muted">{row.KhachHang?.Email}</p>
        </div>
      ),
    },
    { key: 'title', header: 'Câu hỏi đầu tiên', render: (row) => <span className="line-clamp-2 max-w-md">{row.TieuDe}</span> },
    { key: 'count', header: 'Số tin', hideBelow: 'sm', className: 'tabular-nums', render: (row) => row.SoTin },
    {
      key: 'updated',
      header: 'Cập nhật',
      hideBelow: 'md',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => new Date(row.updatedAt).toLocaleString('vi-VN'),
    },
  ];

  return (
    <section className="space-y-4">
      <p className="max-w-2xl text-sm text-ink-muted">
        Các cuộc trò chuyện của khách hàng đã đăng nhập với trợ lý AI. Dùng để kiểm tra chất lượng tư vấn và phát hiện câu hỏi AI
        trả lời chưa tốt (rồi bổ sung hướng dẫn hoặc tri thức). Khách vãng lai không được lưu hội thoại.
      </p>
      <DataTable
        caption="Lịch sử hội thoại với trợ lý AI"
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row._id}
        loading={loading}
        error={data ? null : error}
        onRetry={reload}
        onRowClick={(row) => setOpenId(row._id)}
        emptyTitle="Chưa có cuộc trò chuyện nào"
        emptyDescription="Cuộc trò chuyện sẽ xuất hiện khi khách hàng đã đăng nhập hỏi trợ lý AI."
        footer={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.pagination.total ?? 0}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      />
      {openId && <ConversationModal id={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
}

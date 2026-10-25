import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import DataTable from '../common/DataTable';
import type { DataTableColumn } from '../common/DataTable';
import FormField, { TextArea, TextInput } from '../common/FormField';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/errors';
import { aiAdminService } from '../../services/aiAdminService';
import { toast } from '../../store/toastStore';
import type { KnowledgeEntry } from '../../types/aiAdmin';

const MAX_TITLE = 120;
const MAX_CONTENT = 1000;

function KnowledgeFormModal({ entry, onClose, onSaved }: { entry: KnowledgeEntry | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(entry?.TieuDe ?? '');
  const [content, setContent] = useState(entry?.NoiDung ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Vui lòng nhập tiêu đề';
    else if (title.length > MAX_TITLE) next.title = `Tiêu đề tối đa ${MAX_TITLE} ký tự`;
    if (!content.trim()) next.content = 'Vui lòng nhập nội dung';
    else if (content.length > MAX_CONTENT) next.content = `Nội dung tối đa ${MAX_CONTENT} ký tự`;
    setErrors(next);
    if (next.title || next.content) return;

    setSaving(true);
    try {
      const body = { TieuDe: title.trim(), NoiDung: content.trim() };
      if (entry) await aiAdminService.updateKnowledge(entry._id, body);
      else await aiAdminService.createKnowledge(body);
      toast.success(entry ? 'Đã cập nhật tri thức' : 'Đã thêm tri thức');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={saving}
      title={entry ? 'Sửa tri thức' : 'Thêm tri thức'}
      description="AI chỉ dùng mục này khi câu hỏi của khách liên quan."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" form="knowledge-form" loading={saving}>
            Lưu
          </Button>
        </>
      }
    >
      <form id="knowledge-form" onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <FormField label="Tiêu đề" required error={errors.title} counter={{ current: title.length, max: MAX_TITLE }}>
          {(control) => <TextInput {...control} value={title} placeholder="VD: Khác biệt EDP và EDT" onChange={(e) => setTitle(e.target.value)} />}
        </FormField>
        <FormField label="Nội dung" required error={errors.content} counter={{ current: content.length, max: MAX_CONTENT }}>
          {(control) => (
            <TextArea
              {...control}
              rows={7}
              value={content}
              placeholder="VD: EDP (Eau de Parfum) có nồng độ tinh dầu 15-20%, lưu hương lâu hơn EDT (5-15%)..."
              onChange={(e) => setContent(e.target.value)}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}

export default function KnowledgeTab() {
  const { data, loading, error, reload } = useAsyncData(aiAdminService.listKnowledge);
  // undefined = đóng, null = thêm mới, có mục = sửa mục đó
  const [editing, setEditing] = useState<KnowledgeEntry | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<KnowledgeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (error && data) toast.error(error);
  }, [error, data]);

  const toggle = async (entry: KnowledgeEntry) => {
    setTogglingId(entry._id);
    try {
      await aiAdminService.updateKnowledge(entry._id, { DangBat: !entry.DangBat });
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await aiAdminService.removeKnowledge(toDelete._id);
      toast.success('Đã xóa tri thức');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const usage = data?.usage;
  const columns: ReadonlyArray<DataTableColumn<KnowledgeEntry>> = [
    {
      key: 'title',
      header: 'Tri thức',
      render: (row) => (
        <div className="max-w-xl">
          <p className="font-medium text-ink">{row.TieuDe}</p>
          <p className="line-clamp-2 text-xs text-ink-muted">{row.NoiDung}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge tone={row.DangBat ? 'success' : 'neutral'}>{row.DangBat ? 'Đang bật' : 'Đã tắt'}</StatusBadge>,
    },
    {
      key: 'updated',
      header: 'Cập nhật',
      hideBelow: 'md',
      className: 'whitespace-nowrap tabular-nums',
      render: (row) => new Date(row.updatedAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" icon={Power} aria-label={row.DangBat ? 'Tắt' : 'Bật'} title={row.DangBat ? 'Tắt' : 'Bật'} loading={togglingId === row._id} onClick={() => void toggle(row)} />
          <Button variant="ghost" size="sm" icon={Pencil} aria-label="Sửa" title="Sửa" onClick={() => setEditing(row)} />
          <Button variant="ghost" size="sm" icon={Trash2} aria-label="Xóa" title="Xóa" onClick={() => setToDelete(row)} />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-muted">
          Kiến thức cửa hàng muốn AI dùng khi tư vấn (nồng độ EDP/EDT/Parfum, cách bảo quản, chính sách...). Với mỗi câu hỏi, AI
          tự tìm vài mục liên quan nhất trong các mục đang bật, nên có thể thêm nhiều mục. Mỗi mục nên nói về một chủ đề rõ ràng
          để AI tìm đúng.
          {usage && (
            <span className="mt-1 block text-xs text-ink-faint">
              Đang bật {usage.activeCount} mục (tối đa {usage.maxItems} mục).
            </span>
          )}
        </p>
        <Button variant="primary" icon={Plus} onClick={() => setEditing(null)}>
          Thêm tri thức
        </Button>
      </div>

      <DataTable
        caption="Cơ sở tri thức của trợ lý AI"
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row._id}
        loading={loading}
        error={data ? null : error}
        onRetry={reload}
        emptyTitle="Chưa có tri thức nào"
        emptyDescription="Thêm các mục như khác biệt EDP/EDT, cách bảo quản nước hoa để AI trả lời đúng theo cửa hàng."
      />

      {editing !== undefined && (
        <KnowledgeFormModal
          entry={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Xóa tri thức?"
        message={<>Mục “{toDelete?.TieuDe}” sẽ bị xóa vĩnh viễn. Nếu chỉ muốn tạm dừng, hãy tắt mục này.</>}
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}

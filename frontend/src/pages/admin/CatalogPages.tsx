import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import type { DataTableColumn } from '../../components/common/DataTable';
import FormField, { SelectInput, TextArea, TextInput } from '../../components/common/FormField';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/errors';
import { catalogService } from '../../services/catalogService';
import type { CatalogKind } from '../../services/catalogService';
import { toast } from '../../store/toastStore';

// Ba trang Thương hiệu / Danh mục / Dung tích giống hệt nhau (tên + mô tả), nên dùng chung một trang
// và chỉ khác phần cấu hình dưới đây.

interface CatalogRow {
  _id: string;
  ten: string;
  moTa: string;
  chaId: string | null;
}

interface CatalogFormValues {
  ten: string;
  moTa: string;
  chaId: string;
}

interface CatalogConfig {
  kind: CatalogKind;
  /** Viết thường, dùng trong câu: "Thêm thương hiệu" */
  singular: string;
  description: string;
  tenLabel: string;
  tenMax: number;
  moTaMax: number;
  /** Có chọn được danh mục cha không */
  hasParent: boolean;
  fetchRows: () => Promise<CatalogRow[]>;
  toBody: (values: CatalogFormValues) => Record<string, unknown>;
}

const THUONG_HIEU: CatalogConfig = {
  kind: 'thuonghieu',
  singular: 'thương hiệu',
  description: 'Quản lý thương hiệu nước hoa.',
  tenLabel: 'Tên thương hiệu',
  tenMax: 50,
  moTaMax: 150,
  hasParent: false,
  fetchRows: async () =>
    (await catalogService.getThuongHieu()).map((t) => ({ _id: t._id, ten: t.TenTH, moTa: t.MoTa, chaId: null })),
  toBody: (v) => ({ TenTH: v.ten.trim(), MoTa: v.moTa.trim() }),
};

const DANH_MUC: CatalogConfig = {
  kind: 'danhmuc',
  singular: 'danh mục',
  description: 'Danh mục sản phẩm, hỗ trợ danh mục cha.',
  tenLabel: 'Tên danh mục',
  tenMax: 50,
  moTaMax: 50,
  hasParent: true,
  fetchRows: async () =>
    (await catalogService.getDanhMuc()).map((d) => ({
      _id: d._id,
      ten: d.TenDM,
      moTa: d.MoTa,
      chaId: d.MaDanhMucCha,
    })),
  toBody: (v) => ({ TenDM: v.ten.trim(), MoTa: v.moTa.trim(), MaDanhMucCha: v.chaId || null }),
};

const DUNG_TICH: CatalogConfig = {
  kind: 'dungtich',
  singular: 'dung tích',
  description: 'Các mức dung tích: 10ml, 30ml, 50ml, 100ml...',
  tenLabel: 'Dung tích',
  tenMax: 20,
  moTaMax: 50,
  hasParent: false,
  fetchRows: async () =>
    (await catalogService.getDungTich()).map((d) => ({ _id: d._id, ten: d.TenDungTich, moTa: d.MoTa, chaId: null })),
  toBody: (v) => ({ TenDungTich: v.ten.trim(), MoTa: v.moTa.trim() }),
};

export function ThuongHieuPage() {
  return <CatalogPage config={THUONG_HIEU} />;
}
export function DanhMucPage() {
  return <CatalogPage config={DANH_MUC} />;
}
export function DungTichPage() {
  return <CatalogPage config={DUNG_TICH} />;
}

function CatalogPage({ config }: { config: CatalogConfig }) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { data, loading, error, reload } = useAsyncData(config.fetchRows);

  const [search, setSearch] = useState('');
  // undefined = đóng, null = thêm mới, có dòng = sửa dòng đó
  const [editing, setEditing] = useState<CatalogRow | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<CatalogRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allRows = data ?? [];
  const keyword = search.trim().toLowerCase();
  const rows = keyword ? allRows.filter((r) => r.ten.toLowerCase().includes(keyword)) : allRows;
  const tenCha = new Map(allRows.map((r) => [r._id, r.ten]));

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await catalogService.remove(config.kind, toDelete._id);
      toast.success(`Đã xóa ${config.singular}`);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const columns: Array<DataTableColumn<CatalogRow>> = [
    { key: 'ten', header: config.tenLabel, render: (row) => <span className="font-medium">{row.ten}</span> },
    ...(config.hasParent
      ? [
          {
            key: 'cha',
            header: 'Danh mục cha',
            hideBelow: 'sm' as const,
            render: (row: CatalogRow) => (row.chaId ? (tenCha.get(row.chaId) ?? '—') : '—'),
          },
        ]
      : []),
    { key: 'moTa', header: 'Mô tả', hideBelow: 'md', render: (row) => row.moTa },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            aria-label={`Sửa ${row.ten}`}
            title="Sửa"
            onClick={() => setEditing(row)}
          />
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              aria-label={`Xóa ${row.ten}`}
              title="Xóa"
              onClick={() => setToDelete(row)}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        description={config.description}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing(null)}>
            Thêm {config.singular}
          </Button>
        }
      />

      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <TextInput
          aria-label={`Tìm ${config.singular}`}
          placeholder={`Tìm ${config.singular}`}
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <DataTable
        caption={`Danh sách ${config.singular}`}
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={keyword ? `Không tìm thấy ${config.singular}` : `Chưa có ${config.singular} nào`}
        emptyDescription={keyword ? 'Thử đổi từ khóa tìm kiếm.' : `Bấm "Thêm ${config.singular}" để tạo mới.`}
      />

      {editing !== undefined && (
        <CatalogFormModal
          config={config}
          rows={allRows}
          editing={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Xóa ${config.singular}`}
        message={
          <>
            Xóa <strong className="text-ink">{toDelete?.ten}</strong>? Mục đang được sản phẩm sử dụng (hoặc có danh mục
            con) sẽ không xóa được.
          </>
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

interface CatalogFormModalProps {
  config: CatalogConfig;
  rows: CatalogRow[];
  editing: CatalogRow | null;
  onClose: () => void;
  onSaved: () => void;
}

function CatalogFormModal({ config, rows, editing, onClose, onSaved }: CatalogFormModalProps) {
  const formId = useId();
  const [values, setValues] = useState<CatalogFormValues>({
    ten: editing?.ten ?? '',
    moTa: editing?.moTa ?? '',
    chaId: editing?.chaId ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CatalogFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errs: typeof errors = {};
    const ten = values.ten.trim();
    const moTa = values.moTa.trim();
    if (!ten) errs.ten = `${config.tenLabel} không được để trống`;
    else if (ten.length > config.tenMax) errs.ten = `Tối đa ${config.tenMax} ký tự`;
    if (!moTa) errs.moTa = 'Mô tả không được để trống';
    else if (moTa.length > config.moTaMax) errs.moTa = `Tối đa ${config.moTaMax} ký tự`;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const body = config.toBody(values);
      if (editing) await catalogService.update(config.kind, editing._id, body);
      else await catalogService.create(config.kind, body);
      toast.success(editing ? `Đã cập nhật ${config.singular}` : `Đã thêm ${config.singular}`);
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
      title={editing ? `Sửa ${config.singular}` : `Thêm ${config.singular}`}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            {editing ? 'Lưu thay đổi' : `Thêm ${config.singular}`}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label={config.tenLabel}
          required
          error={errors.ten}
          counter={{ current: values.ten.length, max: config.tenMax }}
        >
          {(control) => (
            <TextInput {...control} value={values.ten} onChange={(e) => setValues({ ...values, ten: e.target.value })} />
          )}
        </FormField>

        <FormField
          label="Mô tả"
          required
          error={errors.moTa}
          counter={{ current: values.moTa.length, max: config.moTaMax }}
        >
          {(control) => (
            <TextArea
              {...control}
              value={values.moTa}
              onChange={(e) => setValues({ ...values, moTa: e.target.value })}
            />
          )}
        </FormField>

        {config.hasParent && (
          <FormField label="Danh mục cha" hint="Bỏ trống nếu đây là danh mục gốc.">
            {(control) => (
              <SelectInput
                {...control}
                value={values.chaId}
                onChange={(e) => setValues({ ...values, chaId: e.target.value })}
              >
                <option value="">Không có (danh mục gốc)</option>
                {rows
                  .filter((r) => r._id !== editing?._id)
                  .map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.ten}
                    </option>
                  ))}
              </SelectInput>
            )}
          </FormField>
        )}
      </form>
    </Modal>
  );
}
import { useCallback, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/errors';
import {
  GIOI_TINH_OPTIONS,
  NHOM_HUONG_OPTIONS,
  PRODUCT_LIMITS,
  isWholeNumber,
  splitList,
} from '../../lib/productOptions';
import { catalogService } from '../../services/catalogService';
import { productService } from '../../services/productService';
import { toast } from '../../store/toastStore';
import type { DanhMucSanPham, DungTich, GioiTinh, NhomHuong, ThuongHieu } from '../../types/catalog';
import type { AdminProductDetail } from '../../types/product';
import Button from '../common/Button';
import ErrorState from '../common/ErrorState';
import FormField, { SelectInput, TextArea, TextInput } from '../common/FormField';
import Modal from '../common/Modal';
import Skeleton from '../common/Skeleton';

interface VariantDraft {
  key: number;
  MaDungTich: string;
  Gia: string;
  SoLuongCo: string;
}

interface FormValues {
  TenSP: string;
  MoTa: string;
  ThongTinChiTiet: string;
  XuatXu: string;
  GioiTinh: GioiTinh | '';
  MaTH: string;
  MaDM: string;
  NhomHuong: NhomHuong[];
  /** Nốt hương: các nốt cách nhau bằng dấu phẩy */
  Dau: string;
  Giua: string;
  Cuoi: string;
  /** Chỉ dùng khi thêm mới */
  bienThe: VariantDraft[];
  hinhAnh: string[];
}

type Errors = Record<string, string>;

let nextVariantKey = 1;

function toFormValues(initial: AdminProductDetail | null): FormValues {
  return {
    TenSP: initial?.TenSP ?? '',
    MoTa: initial?.MoTa ?? '',
    ThongTinChiTiet: initial?.ThongTinChiTiet ?? '',
    XuatXu: initial?.XuatXu ?? '',
    GioiTinh: initial?.GioiTinh ?? '',
    MaTH: initial?.ThuongHieu?._id ?? '',
    MaDM: initial?.DanhMuc?._id ?? '',
    NhomHuong: initial?.NhomHuong ?? [],
    Dau: initial?.NotHuong.Dau.join(', ') ?? '',
    Giua: initial?.NotHuong.Giua.join(', ') ?? '',
    Cuoi: initial?.NotHuong.Cuoi.join(', ') ?? '',
    bienThe: [],
    hinhAnh: [''],
  };
}

const NOT_HUONG_FIELDS = [
  { key: 'Dau', label: 'Nốt đầu', placeholder: 'cam bergamot, chanh' },
  { key: 'Giua', label: 'Nốt giữa', placeholder: 'hoa hồng, hoa nhài' },
  { key: 'Cuoi', label: 'Nốt cuối', placeholder: 'vani, gỗ đàn hương' },
] as const;

const loadOptions = () =>
  Promise.all([catalogService.getThuongHieu(), catalogService.getDanhMuc(), catalogService.getDungTich()]);

interface ProductFormModalProps {
  /** null = thêm mới, có id = sửa sản phẩm đó */
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Tải danh sách thương hiệu/danh mục/dung tích (và chi tiết sản phẩm khi sửa) rồi mới hiện form */
export default function ProductFormModal({ productId, onClose, onSaved }: ProductFormModalProps) {
  const options = useAsyncData(loadOptions);
  const loadDetail = useCallback(
    () => (productId ? productService.get(productId) : Promise.resolve(null)),
    [productId],
  );
  const detail = useAsyncData(loadDetail);

  const title = productId ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
  const error = options.error ?? detail.error;

  if (options.loading || detail.loading || error || !options.data) {
    return (
      <Modal open onClose={onClose} title={title} size="lg">
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              options.reload();
              detail.reload();
            }}
          />
        ) : (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
      </Modal>
    );
  }

  const [thuongHieu, danhMuc, dungTich] = options.data;
  return (
    <ProductForm
      initial={detail.data}
      thuongHieu={thuongHieu}
      danhMuc={danhMuc}
      dungTich={dungTich}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

interface ProductFormProps {
  initial: AdminProductDetail | null;
  thuongHieu: ThuongHieu[];
  danhMuc: DanhMucSanPham[];
  dungTich: DungTich[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductForm({ initial, thuongHieu, danhMuc, dungTich, onClose, onSaved }: ProductFormProps) {
  const formId = useId();
  const isEdit = initial !== null;
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const tenDanhMuc = new Map(danhMuc.map((d) => [d._id, d.TenDM]));

  const toggleNhomHuong = (value: NhomHuong) =>
    set(
      'NhomHuong',
      values.NhomHuong.includes(value) ? values.NhomHuong.filter((v) => v !== value) : [...values.NhomHuong, value],
    );

  // --- biến thể (chỉ khi thêm mới)
  const usedDungTich = new Set(values.bienThe.map((b) => b.MaDungTich).filter(Boolean));
  const addVariant = () =>
    set('bienThe', [...values.bienThe, { key: nextVariantKey++, MaDungTich: '', Gia: '', SoLuongCo: '' }]);
  const updateVariant = (key: number, patch: Partial<VariantDraft>) =>
    set(
      'bienThe',
      values.bienThe.map((b) => (b.key === key ? { ...b, ...patch } : b)),
    );
  const removeVariant = (key: number) =>
    set(
      'bienThe',
      values.bienThe.filter((b) => b.key !== key),
    );

  // --- hình ảnh (chỉ khi thêm mới)
  const updateImage = (index: number, value: string) =>
    set(
      'hinhAnh',
      values.hinhAnh.map((url, i) => (i === index ? value : url)),
    );

  const validate = (): Errors => {
    const errs: Errors = {};
    const need = (key: 'TenSP' | 'MoTa' | 'ThongTinChiTiet' | 'XuatXu', label: string) => {
      const text = values[key].trim();
      if (!text) errs[key] = `${label} không được để trống`;
      else if (text.length > PRODUCT_LIMITS[key]) errs[key] = `Tối đa ${PRODUCT_LIMITS[key]} ký tự`;
    };
    need('TenSP', 'Tên sản phẩm');
    need('MoTa', 'Mô tả');
    need('ThongTinChiTiet', 'Thông tin chi tiết');
    need('XuatXu', 'Xuất xứ');
    if (!values.GioiTinh) errs.GioiTinh = 'Chọn giới tính';
    if (!values.MaTH) errs.MaTH = 'Chọn thương hiệu';
    if (!values.MaDM) errs.MaDM = 'Chọn danh mục';

    for (const { key } of NOT_HUONG_FIELDS) {
      if (splitList(values[key]).some((note) => note.length > PRODUCT_LIMITS.NotHuong)) {
        errs[key] = `Mỗi nốt hương tối đa ${PRODUCT_LIMITS.NotHuong} ký tự`;
      }
    }

    if (!isEdit) {
      for (const b of values.bienThe) {
        if (!b.MaDungTich) errs[`bt-${b.key}`] = 'Chọn dung tích';
        else if (!isWholeNumber(b.Gia)) errs[`bt-${b.key}`] = 'Giá phải là số nguyên >= 0';
        else if (!isWholeNumber(b.SoLuongCo)) errs[`bt-${b.key}`] = 'Tồn kho phải là số nguyên >= 0';
      }
      values.hinhAnh.forEach((url, index) => {
        if (url.trim().length > PRODUCT_LIMITS.DuongDan) errs[`anh-${index}`] = `Tối đa ${PRODUCT_LIMITS.DuongDan} ký tự`;
      });
    }
    return errs;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errs = validate();
    setErrors(errs);
    const gioiTinh = values.GioiTinh;
    if (Object.keys(errs).length > 0 || gioiTinh === '') return;

    const input = {
      TenSP: values.TenSP.trim(),
      MoTa: values.MoTa.trim(),
      ThongTinChiTiet: values.ThongTinChiTiet.trim(),
      XuatXu: values.XuatXu.trim(),
      GioiTinh: gioiTinh,
      NhomHuong: values.NhomHuong,
      NotHuong: { Dau: splitList(values.Dau), Giua: splitList(values.Giua), Cuoi: splitList(values.Cuoi) },
      MaTH: values.MaTH,
      MaDM: values.MaDM,
    };

    setSaving(true);
    try {
      if (initial) {
        await productService.update(initial._id, input);
        toast.success('Đã cập nhật sản phẩm');
      } else {
        await productService.create({
          ...input,
          BienThe: values.bienThe.map((b) => ({
            MaDungTich: b.MaDungTich,
            Gia: Number(b.Gia),
            SoLuongCo: Number(b.SoLuongCo),
          })),
          HinhAnh: values.hinhAnh
            .map((url) => url.trim())
            .filter(Boolean)
            .map((DuongDan) => ({ DuongDan })),
        });
        toast.success('Đã thêm sản phẩm');
      }
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
      size="lg"
      title={isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      description={isEdit ? initial.TenSP : 'Điền thông tin sản phẩm, có thể thêm dung tích và ảnh ngay.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          label="Tên sản phẩm"
          required
          error={errors.TenSP}
          counter={{ current: values.TenSP.length, max: PRODUCT_LIMITS.TenSP }}
        >
          {(control) => <TextInput {...control} value={values.TenSP} onChange={(e) => set('TenSP', e.target.value)} />}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Thương hiệu" required error={errors.MaTH}>
            {(control) => (
              <SelectInput {...control} value={values.MaTH} onChange={(e) => set('MaTH', e.target.value)}>
                <option value="">Chọn thương hiệu</option>
                {thuongHieu.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.TenTH}
                  </option>
                ))}
              </SelectInput>
            )}
          </FormField>

          <FormField label="Danh mục" required error={errors.MaDM}>
            {(control) => (
              <SelectInput {...control} value={values.MaDM} onChange={(e) => set('MaDM', e.target.value)}>
                <option value="">Chọn danh mục</option>
                {danhMuc.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.MaDanhMucCha ? `${tenDanhMuc.get(d.MaDanhMucCha) ?? '...'} › ` : ''}
                    {d.TenDM}
                  </option>
                ))}
              </SelectInput>
            )}
          </FormField>

          <FormField label="Giới tính" required error={errors.GioiTinh}>
            {(control) => (
              <SelectInput
                {...control}
                value={values.GioiTinh}
                onChange={(e) => set('GioiTinh', e.target.value as GioiTinh | '')}
              >
                <option value="">Chọn giới tính</option>
                {GIOI_TINH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            )}
          </FormField>

          <FormField label="Xuất xứ" required error={errors.XuatXu}>
            {(control) => (
              <TextInput {...control} value={values.XuatXu} onChange={(e) => set('XuatXu', e.target.value)} />
            )}
          </FormField>
        </div>

        <FormField
          label="Mô tả ngắn"
          required
          error={errors.MoTa}
          counter={{ current: values.MoTa.length, max: PRODUCT_LIMITS.MoTa }}
        >
          {(control) => <TextArea {...control} value={values.MoTa} onChange={(e) => set('MoTa', e.target.value)} />}
        </FormField>

        <FormField
          label="Thông tin chi tiết"
          required
          error={errors.ThongTinChiTiet}
          counter={{ current: values.ThongTinChiTiet.length, max: PRODUCT_LIMITS.ThongTinChiTiet }}
        >
          {(control) => (
            <TextArea
              {...control}
              className="min-h-32"
              value={values.ThongTinChiTiet}
              onChange={(e) => set('ThongTinChiTiet', e.target.value)}
            />
          )}
        </FormField>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Nhóm hương</legend>
          <div className="flex flex-wrap gap-2">
            {NHOM_HUONG_OPTIONS.map((o) => {
              const selected = values.NhomHuong.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleNhomHuong(o.value)}
                  className={
                    selected
                      ? 'rounded-full border border-accent bg-accent px-3 py-1 text-sm font-medium text-on-accent'
                      : 'rounded-full border border-line px-3 py-1 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink'
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-ink">Nốt hương</h3>
            <p className="text-xs text-ink-muted">Nhập nhiều nốt, cách nhau bằng dấu phẩy.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {NOT_HUONG_FIELDS.map((field) => (
              <FormField key={field.key} label={field.label} error={errors[field.key]}>
                {(control) => (
                  <TextInput
                    {...control}
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                )}
              </FormField>
            ))}
          </div>
        </div>

        {isEdit ? (
          <p className="rounded-control bg-surface-muted px-3 py-2 text-sm text-ink-muted">
            Dung tích, giá và tồn kho chỉnh ở nút <strong className="font-medium text-ink">Biến thể</strong> trong
            danh sách sản phẩm. Hình ảnh sẽ quản lý được ở bước sau.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-ink">Dung tích, giá và tồn kho</h3>
                  <p className="text-xs text-ink-muted">Có thể bỏ trống và thêm sau ở nút Biến thể.</p>
                </div>
                <Button size="sm" icon={Plus} onClick={addVariant} disabled={usedDungTich.size >= dungTich.length}>
                  Thêm dung tích
                </Button>
              </div>

              {values.bienThe.map((b) => (
                <div key={b.key} className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <SelectInput
                      aria-label="Dung tích"
                      invalid={Boolean(errors[`bt-${b.key}`]) && !b.MaDungTich}
                      value={b.MaDungTich}
                      onChange={(e) => updateVariant(b.key, { MaDungTich: e.target.value })}
                    >
                      <option value="">Dung tích</option>
                      {dungTich.map((d) => (
                        <option key={d._id} value={d._id} disabled={usedDungTich.has(d._id) && d._id !== b.MaDungTich}>
                          {d.TenDungTich}
                        </option>
                      ))}
                    </SelectInput>
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      aria-label="Xóa dòng dung tích"
                      className="sm:order-last"
                      onClick={() => removeVariant(b.key)}
                    />
                    <TextInput
                      aria-label="Giá (VND)"
                      placeholder="Giá (VND)"
                      inputMode="numeric"
                      value={b.Gia}
                      onChange={(e) => updateVariant(b.key, { Gia: e.target.value })}
                    />
                    <TextInput
                      aria-label="Tồn kho"
                      placeholder="Tồn kho"
                      inputMode="numeric"
                      value={b.SoLuongCo}
                      onChange={(e) => updateVariant(b.key, { SoLuongCo: e.target.value })}
                    />
                  </div>
                  {errors[`bt-${b.key}`] && (
                    <p role="alert" className="text-xs text-danger">
                      {errors[`bt-${b.key}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-ink">Hình ảnh</h3>
                  <p className="text-xs text-ink-muted">Nhập đường dẫn ảnh, ảnh đầu tiên là ảnh chính.</p>
                </div>
                <Button size="sm" icon={Plus} onClick={() => set('hinhAnh', [...values.hinhAnh, ''])}>
                  Thêm ảnh
                </Button>
              </div>
              {values.hinhAnh.map((url, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label={`Đường dẫn ảnh ${index + 1}`}
                      placeholder="/images/ten-anh.jpg"
                      invalid={Boolean(errors[`anh-${index}`])}
                      value={url}
                      onChange={(e) => updateImage(index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      aria-label="Xóa ảnh"
                      disabled={values.hinhAnh.length === 1}
                      onClick={() =>
                        set(
                          'hinhAnh',
                          values.hinhAnh.filter((_, i) => i !== index),
                        )
                      }
                    />
                  </div>
                  {errors[`anh-${index}`] && (
                    <p role="alert" className="text-xs text-danger">
                      {errors[`anh-${index}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
import { useCallback, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getErrorMessage } from '../../lib/errors';
import { formatNumber, formatVnd } from '../../lib/format';
import { isWholeNumber } from '../../lib/productOptions';
import { catalogService } from '../../services/catalogService';
import { productService } from '../../services/productService';
import { toast } from '../../store/toastStore';
import type { ProductVariant } from '../../types/product';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorState from '../common/ErrorState';
import { SelectInput, TextInput } from '../common/FormField';
import Modal from '../common/Modal';
import Skeleton from '../common/Skeleton';
import StatusBadge from '../common/StatusBadge';

const loadDungTich = () => catalogService.getDungTich();

const ROW_CLASS = 'grid grid-cols-[4.5rem_1fr_1fr_auto] items-center gap-2';

interface ProductVariantsModalProps {
  productId: string;
  productName: string;
  /** Chỉ admin được xóa biến thể */
  canDelete: boolean;
  onClose: () => void;
  /** Gọi sau mỗi thay đổi để danh sách sản phẩm tải lại giá / tồn kho */
  onChanged: () => void;
}

export default function ProductVariantsModal({
  productId,
  productName,
  canDelete,
  onClose,
  onChanged,
}: ProductVariantsModalProps) {
  const loadDetail = useCallback(() => productService.get(productId), [productId]);
  const detail = useAsyncData(loadDetail);
  const dungTich = useAsyncData(loadDungTich);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductVariant | null>(null);
  const [newDungTich, setNewDungTich] = useState('');
  const [newGia, setNewGia] = useState('');
  const [newSoLuong, setNewSoLuong] = useState('');
  const [newError, setNewError] = useState('');

  const run = async (key: string, action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusyKey(key);
    try {
      await action();
      toast.success(success);
      detail.reload();
      onChanged();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const saveVariant = (variant: ProductVariant, gia: string, soLuong: string) =>
    run(
      variant._id,
      () =>
        productService.updateVariant(productId, variant._id, {
          ...(Number(gia) !== variant.Gia ? { Gia: Number(gia) } : {}),
          ...(Number(soLuong) !== variant.SoLuongCo ? { SoLuongCo: Number(soLuong) } : {}),
        }),
      'Đã cập nhật biến thể',
    );

  const addVariant = async () => {
    if (!newDungTich) return setNewError('Chọn dung tích');
    if (!isWholeNumber(newGia)) return setNewError('Giá phải là số nguyên >= 0');
    if (!isWholeNumber(newSoLuong)) return setNewError('Tồn kho phải là số nguyên >= 0');
    setNewError('');
    const ok = await run(
      'new',
      () =>
        productService.addVariant(productId, {
          MaDungTich: newDungTich,
          Gia: Number(newGia),
          SoLuongCo: Number(newSoLuong),
        }),
      'Đã thêm biến thể',
    );
    if (ok) {
      setNewDungTich('');
      setNewGia('');
      setNewSoLuong('');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await run(`del-${toDelete._id}`, () => productService.removeVariant(productId, toDelete._id), 'Đã xóa biến thể');
    setToDelete(null);
  };

  const error = detail.error ?? dungTich.error;
  const product = detail.data;
  const variants = product?.BienThe ?? [];
  const used = new Set(variants.map((v) => v.DungTich?._id));
  const available = (dungTich.data ?? []).filter((d) => !used.has(d._id));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Biến thể dung tích"
      description={productName}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      {error && !product ? (
        <ErrorState
          message={error}
          onRetry={() => {
            detail.reload();
            dungTich.reload();
          }}
        />
      ) : !product ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span>
              Giá: {product.GiaCaoNhat === 0 ? '—' : `${formatVnd(product.GiaThapNhat)} – ${formatVnd(product.GiaCaoNhat)}`}
            </span>
            <span>Tổng tồn: {formatNumber(product.TongTon)}</span>
            {product.TongTon === 0 && <StatusBadge tone="danger">Hết hàng</StatusBadge>}
          </div>

          <div className="space-y-2">
            <div className={`${ROW_CLASS} text-xs font-medium text-ink-muted`}>
              <span>Dung tích</span>
              <span>Giá (VND)</span>
              <span>Tồn kho</span>
              <span className="w-[5.25rem]" />
            </div>

            {variants.length === 0 && (
              <p className="rounded-control bg-surface-muted px-3 py-3 text-sm text-ink-muted">
                Sản phẩm chưa có dung tích nào. Thêm bên dưới để có giá và bán được.
              </p>
            )}

            {variants.map((variant) => (
              <VariantEditor
                key={`${variant._id}-${variant.Gia}-${variant.SoLuongCo}`}
                variant={variant}
                busy={busyKey === variant._id}
                canDelete={canDelete}
                onSave={saveVariant}
                onDelete={() => setToDelete(variant)}
              />
            ))}
          </div>

          <div className="space-y-2 border-t border-line pt-4">
            <h3 className="text-sm font-medium text-ink">Thêm dung tích</h3>
            {available.length === 0 ? (
              <p className="text-sm text-ink-muted">Sản phẩm đã có đủ các dung tích hiện có.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <SelectInput
                    aria-label="Dung tích"
                    value={newDungTich}
                    onChange={(e) => setNewDungTich(e.target.value)}
                  >
                    <option value="">Chọn dung tích</option>
                    {available.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.TenDungTich}
                      </option>
                    ))}
                  </SelectInput>
                  <TextInput
                    aria-label="Giá (VND)"
                    placeholder="Giá (VND)"
                    inputMode="numeric"
                    value={newGia}
                    onChange={(e) => setNewGia(e.target.value)}
                  />
                  <TextInput
                    aria-label="Tồn kho"
                    placeholder="Tồn kho"
                    inputMode="numeric"
                    value={newSoLuong}
                    onChange={(e) => setNewSoLuong(e.target.value)}
                  />
                  <Button variant="primary" icon={Plus} loading={busyKey === 'new'} onClick={addVariant}>
                    Thêm
                  </Button>
                </div>
                {newError && (
                  <p role="alert" className="text-xs text-danger">
                    {newError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Xóa biến thể"
        message={
          <>
            Xóa dung tích <strong className="text-ink">{toDelete?.DungTich?.TenDungTich}</strong> của sản phẩm này? Biến
            thể đã có trong đơn hàng sẽ không xóa được, khi đó hãy đặt tồn kho về 0.
          </>
        }
        loading={busyKey !== null && busyKey.startsWith('del-')}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Modal>
  );
}

interface VariantEditorProps {
  variant: ProductVariant;
  busy: boolean;
  canDelete: boolean;
  onSave: (variant: ProductVariant, gia: string, soLuong: string) => void;
  onDelete: () => void;
}

function VariantEditor({ variant, busy, canDelete, onSave, onDelete }: VariantEditorProps) {
  const [gia, setGia] = useState(String(variant.Gia));
  const [soLuong, setSoLuong] = useState(String(variant.SoLuongCo));

  const dirty = gia !== String(variant.Gia) || soLuong !== String(variant.SoLuongCo);
  const valid = isWholeNumber(gia) && isWholeNumber(soLuong);
  const name = variant.DungTich?.TenDungTich ?? '—';

  return (
    <div className={ROW_CLASS}>
      <span className="text-sm font-medium text-ink">{name}</span>
      <TextInput
        aria-label={`Giá ${name}`}
        inputMode="numeric"
        invalid={!isWholeNumber(gia)}
        value={gia}
        onChange={(e) => setGia(e.target.value)}
      />
      <TextInput
        aria-label={`Tồn kho ${name}`}
        inputMode="numeric"
        invalid={!isWholeNumber(soLuong)}
        value={soLuong}
        onChange={(e) => setSoLuong(e.target.value)}
      />
      <div className="flex gap-1">
        <Button
          variant="ghost"
          icon={Check}
          aria-label={`Lưu ${name}`}
          title="Lưu"
          loading={busy}
          disabled={!dirty || !valid}
          onClick={() => onSave(variant, gia, soLuong)}
        />
        {canDelete ? (
          <Button variant="ghost" icon={Trash2} aria-label={`Xóa ${name}`} title="Xóa" onClick={onDelete} />
        ) : (
          <span className="size-10" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
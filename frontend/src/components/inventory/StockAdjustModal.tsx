import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../common/Button';
import FormField, { TextInput } from '../common/FormField';
import Modal from '../common/Modal';
import SegmentedControl from '../common/SegmentedControl';
import { getErrorMessage } from '../../lib/errors';
import { formatNumber } from '../../lib/format';
import { inventoryService } from '../../services/inventoryService';
import { toast } from '../../store/toastStore';
import type { InventoryRow } from '../../types/inventory';

type Mode = 'them' | 'giam' | 'dat';

const MODES: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: 'them', label: 'Nhập thêm' },
  { value: 'giam', label: 'Giảm bớt' },
  { value: 'dat', label: 'Đặt lại' },
];

const LABEL: Record<Mode, string> = {
  them: 'Số lượng nhập thêm',
  giam: 'Số lượng giảm bớt',
  dat: 'Số lượng thực tế (kiểm kê)',
};

const HINT: Record<Mode, string> = {
  them: 'Cộng vào tồn hiện tại.',
  giam: 'Trừ khỏi tồn hiện tại (hàng hỏng, thất thoát...).',
  dat: 'Thay hẳn tồn kho bằng số đếm được. Nếu vừa có khách đặt hàng, hãy dùng Nhập thêm / Giảm bớt cho chính xác.',
};

const MAX_TON = 1_000_000; // khớp backend (libs/inventoryRules.js)

interface StockAdjustModalProps {
  row: InventoryRow;
  onClose: () => void;
  onSaved: () => void;
}

export default function StockAdjustModal({ row, onClose, onSaved }: StockAdjustModalProps) {
  const formId = useId();
  const [mode, setMode] = useState<Mode>('them');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const so = value === '' ? null : Number(value);
  // tồn sau khi điều chỉnh, để người dùng thấy trước kết quả
  const sau = so === null ? null : mode === 'them' ? row.SoLuongCo + so : mode === 'giam' ? row.SoLuongCo - so : so;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (so === null) return setError('Vui lòng nhập số lượng');
    if (mode !== 'dat' && so <= 0) return setError('Số lượng phải lớn hơn 0');
    if (sau !== null && sau < 0) return setError(`Không thể giảm ${formatNumber(so)}: tồn hiện tại chỉ còn ${formatNumber(row.SoLuongCo)}`);
    if (sau !== null && sau > MAX_TON) return setError(`Tồn kho tối đa là ${formatNumber(MAX_TON)}`);
    setError(undefined);

    setSaving(true);
    try {
      await inventoryService.adjust(
        row._id,
        mode === 'them' ? { ThayDoi: so } : mode === 'giam' ? { ThayDoi: -so } : { SoLuongCo: so },
      );
      toast.success('Đã cập nhật tồn kho');
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
      size="sm"
      title="Điều chỉnh tồn kho"
      description={`${row.SanPham?.TenSP ?? 'Sản phẩm đã xóa'}${row.DungTich ? ` · ${row.DungTich}` : ''}`}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            Lưu
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="text-sm text-ink-muted">
          Tồn hiện tại: <strong className="text-ink tabular-nums">{formatNumber(row.SoLuongCo)}</strong>
        </p>

        <SegmentedControl
          ariaLabel="Cách điều chỉnh"
          options={MODES}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(undefined);
          }}
        />

        <FormField label={LABEL[mode]} required error={error} hint={HINT[mode]}>
          {(control) => (
            <TextInput
              {...control}
              inputMode="numeric"
              maxLength={7}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            />
          )}
        </FormField>

        {sau !== null && (
          <p className="text-sm text-ink-muted">
            Tồn sau điều chỉnh:{' '}
            <strong className={sau < 0 ? 'text-danger tabular-nums' : 'text-ink tabular-nums'}>
              {formatNumber(sau)}
            </strong>
          </p>
        )}
      </form>
    </Modal>
  );
}

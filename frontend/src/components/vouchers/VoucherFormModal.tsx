import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../common/Button';
import FormField, { SelectInput, TextInput } from '../common/FormField';
import Modal from '../common/Modal';
import { getErrorMessage } from '../../lib/errors';
import { formatVnd } from '../../lib/format';
import { toDateInput, todayInput } from '../../lib/voucher';
import { voucherService } from '../../services/voucherService';
import { toast } from '../../store/toastStore';
import type { AdminVoucher, LoaiGiam, VoucherInput } from '../../types/voucher';

interface FormValues {
  maCode: string;
  loaiGiam: LoaiGiam;
  giaTri: string;
  giamToiDa: string;
  donToiThieu: string;
  soLuong: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  dangBat: boolean;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

// Khớp luật của backend (backend/src/libs/voucherRules.js)
const MA_CODE_REGEX = /^[A-Z0-9_-]{3,30}$/;
const MA_CODE_MAX = 30;

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

function initialValues(editing: AdminVoucher | null): FormValues {
  if (!editing) {
    return {
      maCode: '',
      loaiGiam: 'tien',
      giaTri: '',
      giamToiDa: '',
      donToiThieu: '',
      soLuong: '',
      ngayBatDau: todayInput(),
      ngayKetThuc: '',
      dangBat: true,
    };
  }
  return {
    maCode: editing.MaCode ?? '',
    loaiGiam: editing.LoaiGiam,
    giaTri: String(editing.GiaTri),
    giamToiDa: editing.GiamToiDa === null ? '' : String(editing.GiamToiDa),
    donToiThieu: editing.DonToiThieu > 0 ? String(editing.DonToiThieu) : '',
    soLuong: editing.SoLuong === null ? '' : String(editing.SoLuong),
    ngayBatDau: toDateInput(editing.NgayBatDau),
    ngayKetThuc: toDateInput(editing.NgayKetThuc),
    dangBat: editing.DangBat,
  };
}

interface VoucherFormModalProps {
  /** null = thêm mới, có voucher = sửa voucher đó */
  editing: AdminVoucher | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function VoucherFormModal({ editing, onClose, onSaved }: VoucherFormModalProps) {
  const formId = useId();
  const [values, setValues] = useState<FormValues>(() => initialValues(editing));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Voucher đã nằm trong đơn hàng: backend không cho đổi mức giảm (và mã nếu đã có mã)
  const used = editing !== null && editing.SoDon > 0;
  const lockCode = used && editing.MaCode !== null;
  const phanTram = values.loaiGiam === 'phantram';

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errs: FormErrors = {};

    const maCode = values.maCode.trim().toUpperCase();
    if (!maCode) errs.maCode = 'Mã voucher không được để trống';
    else if (!MA_CODE_REGEX.test(maCode)) errs.maCode = 'Gồm 3-30 ký tự: chữ không dấu, số, gạch ngang (-) hoặc gạch dưới (_)';

    const giaTri = Number(values.giaTri);
    if (values.giaTri === '') errs.giaTri = 'Vui lòng nhập mức giảm';
    else if (giaTri <= 0) errs.giaTri = 'Mức giảm phải lớn hơn 0';
    else if (phanTram && giaTri > 100) errs.giaTri = 'Giảm theo phần trăm tối đa là 100';

    const donToiThieu = values.donToiThieu === '' ? 0 : Number(values.donToiThieu);
    if (!phanTram && !errs.giaTri && donToiThieu > 0 && giaTri > donToiThieu) {
      errs.giaTri = 'Số tiền giảm không được lớn hơn đơn tối thiểu';
    }

    if (phanTram && values.giamToiDa !== '' && Number(values.giamToiDa) <= 0) {
      errs.giamToiDa = 'Giảm tối đa phải lớn hơn 0 (hoặc để trống nếu không giới hạn)';
    }

    if (values.soLuong !== '') {
      const soLuong = Number(values.soLuong);
      if (soLuong < 1) errs.soLuong = 'Số lượt phải từ 1 trở lên (hoặc để trống nếu không giới hạn)';
      else if (editing && soLuong < editing.DaDung) errs.soLuong = `Không được nhỏ hơn số lượt đã dùng (${editing.DaDung})`;
    }

    if (!values.ngayBatDau) errs.ngayBatDau = 'Chọn ngày bắt đầu';
    if (!values.ngayKetThuc) errs.ngayKetThuc = 'Chọn ngày kết thúc';
    else if (values.ngayBatDau && values.ngayKetThuc < values.ngayBatDau) {
      errs.ngayKetThuc = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu';
    } else if (!editing && values.ngayKetThuc < todayInput()) {
      errs.ngayKetThuc = 'Ngày kết thúc phải từ hôm nay trở đi';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: VoucherInput = {
      MaCode: maCode,
      LoaiGiam: values.loaiGiam,
      GiaTri: giaTri,
      GiamToiDa: phanTram && values.giamToiDa !== '' ? Number(values.giamToiDa) : null,
      DonToiThieu: donToiThieu,
      SoLuong: values.soLuong === '' ? null : Number(values.soLuong),
      DangBat: values.dangBat,
      NgayBatDau: values.ngayBatDau,
      NgayKetThuc: values.ngayKetThuc,
    };

    setSaving(true);
    try {
      if (editing) await voucherService.update(editing._id, body);
      else await voucherService.create(body);
      toast.success(editing ? 'Đã cập nhật voucher' : 'Đã thêm voucher');
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
      title={editing ? 'Sửa voucher' : 'Thêm voucher'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            {editing ? 'Lưu thay đổi' : 'Thêm voucher'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        {used && (
          <p className="rounded-control bg-info-soft px-3 py-2 text-sm text-info">
            Voucher này đã nằm trong {editing.SoDon} đơn hàng nên không đổi được mã và mức giảm. Muốn đổi, hãy tắt
            voucher này và tạo voucher mới.
          </p>
        )}

        <FormField
          label="Mã voucher"
          required
          error={errors.maCode}
          hint={editing && editing.MaCode === null ? 'Voucher cũ chưa có mã, hãy đặt mã để khách nhập được.' : 'Khách nhập mã này khi thanh toán. Tự viết hoa.'}
          counter={{ current: values.maCode.length, max: MA_CODE_MAX }}
        >
          {(control) => (
            <TextInput
              {...control}
              className="font-mono uppercase"
              placeholder="VD: SALE10"
              autoComplete="off"
              disabled={lockCode}
              value={values.maCode}
              onChange={(e) => set('maCode', e.target.value.toUpperCase())}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Loại giảm" required>
            {(control) => (
              <SelectInput
                {...control}
                disabled={used}
                value={values.loaiGiam}
                onChange={(e) => set('loaiGiam', e.target.value as LoaiGiam)}
              >
                <option value="tien">Giảm số tiền (₫)</option>
                <option value="phantram">Giảm theo phần trăm (%)</option>
              </SelectInput>
            )}
          </FormField>

          <FormField
            label={phanTram ? 'Phần trăm giảm (%)' : 'Số tiền giảm (₫)'}
            required
            error={errors.giaTri}
            hint={!phanTram && values.giaTri !== '' ? formatVnd(Number(values.giaTri)) : undefined}
          >
            {(control) => (
              <TextInput
                {...control}
                inputMode="numeric"
                maxLength={phanTram ? 3 : 9}
                placeholder={phanTram ? 'VD: 10' : 'VD: 100000'}
                disabled={used}
                value={values.giaTri}
                onChange={(e) => set('giaTri', onlyDigits(e.target.value))}
              />
            )}
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Đơn tối thiểu (₫)"
            error={errors.donToiThieu}
            hint={values.donToiThieu !== '' ? formatVnd(Number(values.donToiThieu)) : 'Để trống nếu áp dụng cho mọi đơn.'}
          >
            {(control) => (
              <TextInput
                {...control}
                inputMode="numeric"
                maxLength={9}
                placeholder="VD: 500000"
                value={values.donToiThieu}
                onChange={(e) => set('donToiThieu', onlyDigits(e.target.value))}
              />
            )}
          </FormField>

          {phanTram && (
            <FormField
              label="Giảm tối đa (₫)"
              error={errors.giamToiDa}
              hint={values.giamToiDa !== '' ? formatVnd(Number(values.giamToiDa)) : 'Để trống nếu không giới hạn.'}
            >
              {(control) => (
                <TextInput
                  {...control}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="VD: 200000"
                  disabled={used}
                  value={values.giamToiDa}
                  onChange={(e) => set('giamToiDa', onlyDigits(e.target.value))}
                />
              )}
            </FormField>
          )}
        </div>

        <FormField
          label="Tổng số lượt dùng"
          error={errors.soLuong}
          hint={
            editing && editing.DaDung > 0
              ? `Đã dùng ${editing.DaDung} lượt. Để trống nếu không giới hạn.`
              : 'Để trống nếu không giới hạn.'
          }
        >
          {(control) => (
            <TextInput
              {...control}
              inputMode="numeric"
              maxLength={6}
              placeholder="VD: 100"
              value={values.soLuong}
              onChange={(e) => set('soLuong', onlyDigits(e.target.value))}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ngày bắt đầu" required error={errors.ngayBatDau}>
            {(control) => (
              <TextInput
                {...control}
                type="date"
                max={values.ngayKetThuc || undefined}
                value={values.ngayBatDau}
                onChange={(e) => set('ngayBatDau', e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Ngày kết thúc" required error={errors.ngayKetThuc} hint="Dùng được hết ngày này.">
            {(control) => (
              <TextInput
                {...control}
                type="date"
                min={values.ngayBatDau || undefined}
                value={values.ngayKetThuc}
                onChange={(e) => set('ngayKetThuc', e.target.value)}
              />
            )}
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={values.dangBat}
            onChange={(e) => set('dangBat', e.target.checked)}
          />
          Bật voucher (khách dùng được khi còn hạn và còn lượt)
        </label>
      </form>
    </Modal>
  );
}

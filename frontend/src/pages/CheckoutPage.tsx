import { useCallback, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, ChevronDown, Landmark, LogOut, ShoppingCart } from 'lucide-react';
import logo from '../assets/logo.png';
import SiteLayout from '../components/SiteLayout';
import { BottlePlaceholder } from '../components/shop/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getErrorMessage } from '../lib/errors';
import { formatVnd } from '../lib/format';
import { GIOI_TINH_LABEL, variantLabel } from '../lib/productOptions';
import { customerOrderService } from '../services/customerOrderService';
import { locationService } from '../services/locationService.ts';
import type { LocationItem } from '../services/locationService.ts';
import { useCartStore } from '../store/cartStore';
import type { CartItem } from '../types/cart';
import type { PaymentMethod, VoucherPreview } from '../types/customerOrder';
import '../components/shop/ProductCard.css';
import './CheckoutPage.css';

// Giới hạn khớp với backend (customerOrderController.js + model DonHang)
const MAX_NAME_BUYER = 50;
const MAX_NAME_RECEIVER = 100;
const MAX_ADDRESS = 150;
const MAX_NOTE = 150;
const SDT_REGEX = /^(?:\+84|0)\d{9,10}$/;

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const cleanPhone = (value: string) => value.replace(/[\s.]/g, '');

// ---------- Dữ liệu form ----------

/** Một bộ thông tin: dùng cho người mua và (khi tick "giao đến địa chỉ khác") cho người nhận */
interface Addr {
  ten: string;
  sdt: string;
  diaChi: string;
  tinhCode: number | null;
  tinhName: string;
  phuongCode: number | null;
  phuongName: string;
}
type Group = 'buyer' | 'receiver';
type AddrField = 'ten' | 'sdt' | 'diaChi' | 'tinh' | 'phuong';
type AddrErrors = Partial<Record<AddrField, string>>;

interface FormState {
  buyer: Addr;
  other: boolean;
  receiver: Addr;
  ghiChu: string;
  maPTTT: string;
  agree: boolean;
}
interface Errors {
  buyer: AddrErrors;
  receiver: AddrErrors;
  maPTTT?: string;
  agree?: string;
}

const emptyAddr = (): Addr => ({
  ten: '',
  sdt: '',
  diaChi: '',
  tinhCode: null,
  tinhName: '',
  phuongCode: null,
  phuongName: '',
});

const NO_ERRORS: Errors = { buyer: {}, receiver: {} };

// "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh"
const composeAddress = (a: Addr) =>
  [a.diaChi.trim(), a.phuongName.trim(), a.tinhName.trim()].filter(Boolean).join(', ');

const isAddressComplete = (a: Addr) => a.diaChi.trim() !== '' && a.phuongName.trim() !== '' && a.tinhName.trim() !== '';

function validateAddr(a: Addr, maxName: number): AddrErrors {
  const e: AddrErrors = {};
  const ten = a.ten.trim();
  if (ten.length < 2) e.ten = 'Nhập họ và tên (ít nhất 2 ký tự).';
  else if (ten.length > maxName) e.ten = `Họ và tên tối đa ${maxName} ký tự.`;

  if (!SDT_REGEX.test(cleanPhone(a.sdt))) e.sdt = 'Số điện thoại chưa đúng, ví dụ 0901234567.';
  if (a.diaChi.trim().length < 3) e.diaChi = 'Nhập số nhà và tên đường.';
  if (!a.tinhName.trim()) e.tinh = 'Chọn tỉnh/thành.';
  if (!a.phuongName.trim()) e.phuong = 'Chọn phường/xã.';
  if (!e.diaChi && composeAddress(a).length > MAX_ADDRESS) {
    e.diaChi = 'Địa chỉ quá dài, hãy rút gọn số nhà và tên đường.';
  }
  return e;
}

const fieldId = (group: Group, field: AddrField) => `co-${group}-${field}`;
const FIELD_ORDER: AddrField[] = ['ten', 'sdt', 'diaChi', 'tinh', 'phuong'];
const PTTT_ID = 'co-pttt';
const AGREE_ID = 'co-agree';

// patch của Addr -> ô lỗi cần xóa khi khách sửa
const PATCH_TO_FIELD: Record<keyof Addr, AddrField> = {
  ten: 'ten',
  sdt: 'sdt',
  diaChi: 'diaChi',
  tinhCode: 'tinh',
  tinhName: 'tinh',
  phuongCode: 'phuong',
  phuongName: 'phuong',
};

// ---------- Ô nhập có nhãn nổi ----------

interface FloatInputProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  inputMode?: 'text' | 'tel';
  autoComplete?: string;
  maxLength?: number;
  /** Phần phụ nằm bên phải ô (ví dụ lá cờ) */
  suffix?: ReactNode;
}

function FloatInput({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  required,
  multiline,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
  suffix,
}: FloatInputProps) {
  const common = {
    id,
    value,
    disabled,
    maxLength,
    autoComplete,
    placeholder: ' ', // để CSS :placeholder-shown biết ô đang trống
    className: 'co-field__control',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
    'aria-required': required ? true : undefined,
    onChange: onChange ? (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value) : undefined,
    readOnly: !onChange,
  } as const;

  return (
    <div className="co-field">
      <div className={`co-field__box${multiline ? ' co-field__box--multi' : ''}${suffix ? ' co-field__box--suffix' : ''}`}>
        {multiline ? (
          <textarea {...common} rows={3} />
        ) : (
          <input {...common} type={type} inputMode={inputMode} />
        )}
        <label htmlFor={id} className="co-field__label">
          {label}
        </label>
        {suffix}
      </div>
      {error && (
        <p id={`${id}-error`} className="co-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

interface FloatSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

function FloatSelect({ id, label, value, onChange, options, error, disabled, required }: FloatSelectProps) {
  return (
    <div className="co-field">
      <div className="co-field__box co-field__box--select">
        <select
          id={id}
          value={value}
          disabled={disabled}
          className="co-field__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required={required ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">---</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label htmlFor={id} className="co-field__label">
          {label}
        </label>
        <ChevronDown className="co-field__caret" size={16} aria-hidden="true" />
      </div>
      {error && (
        <p id={`${id}-error`} className="co-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

function VietnamFlag() {
  return (
    <svg className="co-flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#da251d" />
      <polygon
        fill="#ff0"
        points="15,4 16.8,9.5 22.5,9.5 17.9,12.9 19.6,18.3 15,15 10.4,18.3 12.1,12.9 7.5,9.5 13.2,9.5"
      />
    </svg>
  );
}

// ---------- Cụm ô địa chỉ (người mua hoặc người nhận) ----------

const loadProvinces = () => locationService.getProvinces();

interface AddressFieldsProps {
  group: Group;
  value: Addr;
  errors: AddrErrors;
  maxName: number;
  email?: string;
  onChange: (patch: Partial<Addr>) => void;
}

function AddressFields({ group, value, errors, maxName, email, onChange }: AddressFieldsProps) {
  const provinces = useAsyncData<LocationItem[]>(loadProvinces);

  const loadWards = useCallback(
    () =>
      value.tinhCode !== null
        ? locationService.getWards(value.tinhCode)
        : Promise.resolve<LocationItem[]>([]),
    [value.tinhCode],
  );
  const wards = useAsyncData<LocationItem[]>(loadWards);

  // API địa danh lỗi hoặc rỗng thì cho khách tự gõ để không chặn việc đặt hàng
  const provinceList = provinces.data ?? [];
  const provinceTyped = Boolean(provinces.error) || (provinces.data !== null && provinceList.length === 0);
  const wardList = wards.loading ? [] : (wards.data ?? []);
  const wardTyped =
    provinceTyped || (value.tinhCode !== null && !wards.loading && (Boolean(wards.error) || wardList.length === 0));

  const pickProvince = (code: string) => {
    const found = provinceList.find((p) => String(p.code) === code);
    onChange({
      tinhCode: found?.code ?? null,
      tinhName: found?.name ?? '',
      phuongCode: null,
      phuongName: '',
    });
  };
  const pickWard = (code: string) => {
    const found = wardList.find((w) => String(w.code) === code);
    onChange({ phuongCode: found?.code ?? null, phuongName: found?.name ?? '' });
  };

  return (
    <>
      {email !== undefined && <FloatInput id="co-email" label="Email" value={email} disabled />}

      <FloatInput
        id={fieldId(group, 'ten')}
        label="Họ và tên"
        required
        value={value.ten}
        onChange={(v) => onChange({ ten: v })}
        error={errors.ten}
        maxLength={maxName}
        autoComplete={group === 'buyer' ? 'name' : 'off'}
      />
      <FloatInput
        id={fieldId(group, 'sdt')}
        label="Số điện thoại"
        required
        type="tel"
        inputMode="tel"
        value={value.sdt}
        onChange={(v) => onChange({ sdt: v })}
        error={errors.sdt}
        maxLength={15}
        autoComplete={group === 'buyer' ? 'tel' : 'off'}
        suffix={<VietnamFlag />}
      />
      <FloatInput
        id={fieldId(group, 'diaChi')}
        label="Địa chỉ (số nhà, tên đường)"
        required
        value={value.diaChi}
        onChange={(v) => onChange({ diaChi: v })}
        error={errors.diaChi}
        maxLength={100}
        autoComplete={group === 'buyer' ? 'address-line1' : 'off'}
      />

      {provinceTyped ? (
        <FloatInput
          id={fieldId(group, 'tinh')}
          label="Tỉnh/Thành"
          required
          value={value.tinhName}
          onChange={(v) => onChange({ tinhCode: null, tinhName: v })}
          error={errors.tinh}
          maxLength={50}
        />
      ) : (
        <FloatSelect
          id={fieldId(group, 'tinh')}
          label="Tỉnh/Thành"
          required
          value={value.tinhCode === null ? '' : String(value.tinhCode)}
          onChange={pickProvince}
          options={provinceList.map((p) => ({ value: String(p.code), label: p.name }))}
          error={errors.tinh}
          disabled={provinces.loading}
        />
      )}

      {wardTyped ? (
        <FloatInput
          id={fieldId(group, 'phuong')}
          label="Phường/Xã"
          required
          value={value.phuongName}
          onChange={(v) => onChange({ phuongCode: null, phuongName: v })}
          error={errors.phuong}
          maxLength={50}
        />
      ) : (
        <FloatSelect
          id={fieldId(group, 'phuong')}
          label="Phường/Xã"
          required
          value={value.phuongCode === null ? '' : String(value.phuongCode)}
          onChange={pickWard}
          options={wardList.map((w) => ({ value: String(w.code), label: w.name }))}
          error={errors.phuong}
          disabled={value.tinhCode === null || wards.loading}
        />
      )}
    </>
  );
}

// ---------- Thanh toán ----------

const isTransfer = (name: string) => name.normalize('NFC').toLowerCase().includes('chuyển khoản');

function PaymentList({
  methods,
  value,
  onChange,
  error,
}: {
  methods: PaymentMethod[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  // Chuyển khoản đứng trước COD như thiết kế
  const sorted = [...methods].sort((a, b) => Number(isTransfer(b.TenPTTT)) - Number(isTransfer(a.TenPTTT)));
  return (
    <div role="radiogroup" aria-label="Phương thức thanh toán" aria-describedby={error ? `${PTTT_ID}-error` : undefined}>
      <div className="co-pay">
        {sorted.map((m, index) => {
          const Icon = isTransfer(m.TenPTTT) ? Landmark : Banknote;
          return (
            <label key={m._id} className="co-pay__row">
              <input
                type="radio"
                name="pttt"
                id={index === 0 ? PTTT_ID : undefined}
                value={m._id}
                checked={value === m._id}
                onChange={() => onChange(m._id)}
              />
              <span className="co-pay__name">{m.TenPTTT}</span>
              <Icon className="co-pay__icon" size={20} strokeWidth={1.5} aria-hidden="true" />
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${PTTT_ID}-error`} className="co-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------- Cột tóm tắt đơn ----------

function SummaryThumb({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="co-item__thumb">
      {item.AnhChinh && !failed ? (
        <img src={item.AnhChinh} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <BottlePlaceholder />
      )}
      <span className="co-item__badge">
        <span className="co-sr">Số lượng </span>
        {item.SoLuongChonMua}
      </span>
    </span>
  );
}

// ---------- Form ----------

function CheckoutForm({ methods }: { methods: PaymentMethod[] }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { items, tongSoLuong, tamTinh, load } = useCartStore();

  const [form, setForm] = useState<FormState>(() => ({
    buyer: { ...emptyAddr(), ten: `${str(user?.Ho)} ${str(user?.Ten)}`.trim(), sdt: str(user?.SoDienThoai) },
    other: false,
    receiver: emptyAddr(),
    ghiChu: '',
    maPTTT: '',
    agree: false,
  }));
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mã giảm giá: server tính tiền giảm trên giỏ; khi đặt hàng chỉ gửi MaCode, server kiểm tra lại
  const [voucherInput, setVoucherInput] = useState('');
  const [voucher, setVoucher] = useState<VoucherPreview | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  // giỏ đổi tiền hàng sau khi áp mã thì kết quả cũ không còn đúng -> coi như chưa áp
  const activeVoucher = voucher && voucher.TamTinh === tamTinh ? voucher : null;
  const voucherStale = voucher !== null && activeVoucher === null;
  const tienGiam = activeVoucher?.TienGiam ?? 0;
  const tongCong = Math.max(tamTinh - tienGiam, 0);

  const applyVoucher = async () => {
    const code = voucherInput.trim();
    if (!code || voucherLoading) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const result = await customerOrderService.previewVoucher(code);
      setVoucher(result);
      setVoucherInput(result.MaCode);
    } catch (err) {
      setVoucher(null);
      setVoucherError(getErrorMessage(err));
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setVoucher(null);
    setVoucherInput('');
    setVoucherError('');
  };

  const patchAddr = (group: Group) => (patch: Partial<Addr>) => {
    setForm((prev) =>
      group === 'buyer'
        ? { ...prev, buyer: { ...prev.buyer, ...patch } }
        : { ...prev, receiver: { ...prev.receiver, ...patch } },
    );
    setErrors((prev) => {
      const next = { ...prev[group] };
      for (const key of Object.keys(patch) as Array<keyof Addr>) delete next[PATCH_TO_FIELD[key]];
      return group === 'buyer' ? { ...prev, buyer: next } : { ...prev, receiver: next };
    });
  };

  const hasProblem = items.some((i) => i.SoLuongCo <= 0 || i.SoLuongChonMua > i.SoLuongCo);
  const target = form.other ? form.receiver : form.buyer;

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || hasProblem) return;

    const found: Errors = {
      buyer: validateAddr(form.buyer, MAX_NAME_BUYER),
      receiver: form.other ? validateAddr(form.receiver, MAX_NAME_RECEIVER) : {},
      maPTTT: form.maPTTT ? undefined : 'Chọn phương thức thanh toán.',
      agree: form.agree ? undefined : 'Bạn cần đồng ý với các chính sách để đặt hàng.',
    };
    setErrors(found);

    // đưa con trỏ tới ô lỗi đầu tiên (theo thứ tự trên màn hình)
    const ids: string[] = [];
    (['buyer', 'receiver'] as Group[]).forEach((g) =>
      FIELD_ORDER.forEach((f) => found[g][f] && ids.push(fieldId(g, f))),
    );
    if (found.maPTTT) ids.push(PTTT_ID);
    if (found.agree) ids.push(AGREE_ID);
    if (ids.length) {
      document.getElementById(ids[0])?.focus();
      return;
    }

    const rcv = form.other ? form.receiver : form.buyer;
    setSubmitting(true);
    setServerError('');
    try {
      const order = await customerOrderService.create({
        HoTenKH: form.buyer.ten.trim(),
        SoDienThoaiKH: cleanPhone(form.buyer.sdt),
        DiaChiKH: composeAddress(form.buyer),
        HoTenNguoiNhan: rcv.ten.trim(),
        SoDienThoaiNguoiNhan: cleanPhone(rcv.sdt),
        DiaChiNguoiNhan: composeAddress(rcv),
        MaPTTT: form.maPTTT,
        GhiChu: form.ghiChu.trim(),
        MaCode: activeVoucher?.MaCode,
      });
      navigate(`/don-hang/${order._id}`, { replace: true, state: { justOrdered: true } });
      void load(); // giỏ trên server đã được xóa, cập nhật số trên icon giỏ
    } catch (err) {
      setServerError(getErrorMessage(err));
      void load(); // giỏ có thể đã đổi (hết hàng...) nên tải lại để khớp với server
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="co" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="co__main">
        <div className="co__main-inner">
          <Link to="/" className="co__logo" aria-label="Parfumerie - về trang chủ">
            <img src={logo} alt="Parfumerie" />
          </Link>

          <div className="co__cols">
            <section className="co__col" aria-labelledby="co-buy-title">
              <div className="co__title-row">
                <h2 id="co-buy-title" className="co__title">
                  Thông tin mua hàng
                </h2>
                <button type="button" className="co__logout" onClick={() => void handleSignOut()}>
                  <LogOut size={14} aria-hidden="true" />
                  Đăng xuất
                </button>
              </div>

              <AddressFields
                group="buyer"
                value={form.buyer}
                errors={errors.buyer}
                maxName={MAX_NAME_BUYER}
                email={str(user?.Email)}
                onChange={patchAddr('buyer')}
              />

              <label className="co__check">
                <input
                  type="checkbox"
                  checked={form.other}
                  onChange={(e) => setForm((prev) => ({ ...prev, other: e.target.checked }))}
                />
                <span>Giao hàng đến địa chỉ khác</span>
              </label>

              {form.other && (
                <div className="co__other">
                  <AddressFields
                    group="receiver"
                    value={form.receiver}
                    errors={errors.receiver}
                    maxName={MAX_NAME_RECEIVER}
                    onChange={patchAddr('receiver')}
                  />
                </div>
              )}

              <FloatInput
                id="co-ghichu"
                label="Ghi chú (tùy chọn)"
                multiline
                value={form.ghiChu}
                onChange={(v) => setForm((prev) => ({ ...prev, ghiChu: v }))}
                maxLength={MAX_NOTE}
              />
            </section>

            <div className="co__col">
              <section aria-labelledby="co-ship-title">
                <h2 id="co-ship-title" className="co__title">
                  Vận chuyển
                </h2>
                <p className="co__ship" aria-live="polite">
                  {isAddressComplete(target)
                    ? `Giao đến: ${composeAddress(target)}`
                    : 'Vui lòng nhập thông tin giao hàng'}
                </p>
              </section>

              <section aria-labelledby="co-pay-title">
                <h2 id="co-pay-title" className="co__title">
                  Thanh toán
                </h2>
                <PaymentList
                  methods={methods}
                  value={form.maPTTT}
                  onChange={(id) => {
                    setForm((prev) => ({ ...prev, maPTTT: id }));
                    setErrors((prev) => ({ ...prev, maPTTT: undefined }));
                  }}
                  error={errors.maPTTT}
                />
              </section>
            </div>
          </div>

          <div className="co__agree">
            <label className="co__check">
              <input
                id={AGREE_ID}
                type="checkbox"
                checked={form.agree}
                aria-invalid={errors.agree ? true : undefined}
                aria-describedby={errors.agree ? `${AGREE_ID}-error` : undefined}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, agree: e.target.checked }));
                  setErrors((prev) => ({ ...prev, agree: undefined }));
                }}
              />
              <span>
                Tôi đã đọc và đồng ý với chính sách bảo mật thông tin, bảo mật thông tin thanh toán và các chính
                sách bán hàng trên website này.
              </span>
            </label>
            {errors.agree && (
              <p id={`${AGREE_ID}-error`} className="co-field__error">
                {errors.agree}
              </p>
            )}
          </div>
        </div>
      </div>

      <aside className="co__side" aria-labelledby="co-sum-title">
        <div className="co__side-inner">
          <h2 id="co-sum-title" className="co__title">
            Đơn hàng ({tongSoLuong} sản phẩm)
          </h2>

          <ul className="co-items">
            {items.map((item) => (
              <li key={item._id} className="co-item">
                <SummaryThumb item={item} />
                <div className="co-item__info">
                  <Link to={`/nuoc-hoa/${item.MaSP}`} className="co-item__name">
                    {item.TenSP}
                  </Link>
                  <p className="co-item__meta">
                    {GIOI_TINH_LABEL[item.GioiTinh] ?? item.GioiTinh} / {item.XuatXu} / {variantLabel(item.TenDungTich)}
                  </p>
                </div>
                <p className="co-item__price">{formatVnd(item.Gia * item.SoLuongChonMua)}</p>
              </li>
            ))}
          </ul>

          <div className="co-voucher">
            <div className="co-voucher__row">
              <input
                type="text"
                className="co-voucher__input"
                placeholder="Nhập mã giảm giá"
                aria-label="Mã giảm giá"
                value={voucherInput}
                maxLength={30}
                autoCapitalize="characters"
                autoComplete="off"
                disabled={activeVoucher !== null || voucherLoading}
                onChange={(e) => {
                  setVoucherInput(e.target.value.toUpperCase());
                  setVoucherError('');
                }}
                onKeyDown={(e) => {
                  // Enter trong ô này là áp mã, không phải gửi cả form đặt hàng
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void applyVoucher();
                  }
                }}
              />
              {activeVoucher ? (
                <button type="button" className="co-voucher__btn co-voucher__btn--ghost" onClick={removeVoucher}>
                  Bỏ mã
                </button>
              ) : (
                <button
                  type="button"
                  className="co-voucher__btn"
                  onClick={() => void applyVoucher()}
                  disabled={voucherLoading || voucherInput.trim() === ''}
                >
                  {voucherLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                </button>
              )}
            </div>
            {activeVoucher && (
              <p className="co-voucher__ok">
                Đã áp dụng mã {activeVoucher.MaCode}: giảm {formatVnd(activeVoucher.TienGiam)}
              </p>
            )}
            {voucherStale && (
              <p className="co-voucher__err" role="alert">
                Giỏ hàng đã thay đổi, vui lòng áp dụng lại mã giảm giá.
              </p>
            )}
            {voucherError && (
              <p className="co-voucher__err" role="alert">
                {voucherError}
              </p>
            )}
          </div>

          <dl className="co-sum">
            <div>
              <dt>Tạm tính</dt>
              <dd>{formatVnd(tamTinh)}</dd>
            </div>
            {activeVoucher && (
              <div>
                <dt>Giảm giá ({activeVoucher.MaCode})</dt>
                <dd>-{formatVnd(tienGiam)}</dd>
              </div>
            )}
            <div>
              <dt>Phí vận chuyển</dt>
              <dd aria-label="Chưa có phí vận chuyển">-</dd>
            </div>
            <div className="co-sum__total">
              <dt>Tổng cộng</dt>
              <dd>{formatVnd(tongCong)}</dd>
            </div>
          </dl>

          {hasProblem && (
            <p className="co__alert" role="alert">
              Có sản phẩm hết hàng hoặc vượt tồn kho. <Link to="/gio-hang">Quay lại giỏ hàng để chỉnh sửa</Link>
            </p>
          )}
          {serverError && (
            <p className="co__alert" role="alert">
              {serverError} <Link to="/gio-hang">Xem giỏ hàng</Link>
            </p>
          )}

          <div className="co__actions">
            <Link to="/gio-hang" className="co__back">
              ‹ Quay về giỏ hàng
            </Link>
            <button type="submit" className="co__submit" disabled={submitting || hasProblem}>
              {submitting ? 'Đang đặt...' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}

// ---------- Trang ----------

function Notice({ title, text, to, action, icon = true }: { title: string; text: string; to: string; action: string; icon?: boolean }) {
  return (
    <div className="site__empty">
      {icon && <ShoppingCart className="site__empty-icon" size={44} strokeWidth={1.25} aria-hidden="true" />}
      <h1>{title}</h1>
      <p>{text}</p>
      <Link to={to} className="site__empty-link">
        {action}
      </Link>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="co-skel" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="co-skel__row" />
      ))}
    </div>
  );
}

function StateMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="co-state" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="co-state__link" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const { role, loading: authLoading } = useAuth();
  const { items, loaded, loading, error, load } = useCartStore();

  // chỉ gọi API khi là khách hàng (khách chưa đăng nhập / nhân viên không đặt hàng)
  const loadMethods = useCallback(
    () => (role === 'customer' ? customerOrderService.getPaymentMethods() : Promise.resolve<PaymentMethod[]>([])),
    [role],
  );
  const methods = useAsyncData<PaymentMethod[]>(loadMethods);

  // Khi chưa đủ điều kiện hiện form thì dùng khung trang của cửa hàng (có header) để khách còn đường đi tiếp
  let content;
  if (authLoading) {
    content = <CheckoutSkeleton />;
  } else if (!role) {
    content = (
      <Notice
        title="Đăng nhập để thanh toán"
        text="Bạn cần đăng nhập để đặt hàng và theo dõi đơn."
        to="/login"
        action="Đăng nhập"
      />
    );
  } else if (role !== 'customer') {
    content = (
      <Notice
        title="Tài khoản quản trị không đặt hàng được"
        text="Hãy đăng nhập bằng tài khoản khách hàng để mua sắm."
        to="/"
        action="Về trang chủ"
        icon={false}
      />
    );
  } else if (error && items.length === 0) {
    content = <StateMessage message={error} onRetry={() => void load()} />;
  } else if (!loaded || (loading && items.length === 0)) {
    content = <CheckoutSkeleton />;
  } else if (items.length === 0) {
    content = (
      <Notice
        title="Giỏ hàng của bạn đang trống"
        text="Thêm sản phẩm vào giỏ trước khi thanh toán."
        to="/"
        action="Tiếp tục mua sắm"
      />
    );
  } else if (methods.loading) {
    content = <CheckoutSkeleton />;
  } else if (methods.error) {
    content = <StateMessage message={methods.error} onRetry={methods.reload} />;
  } else if (!methods.data || methods.data.length === 0) {
    content = <StateMessage message="Cửa hàng chưa có phương thức thanh toán nào, vui lòng quay lại sau." />;
  } else {
    return <CheckoutForm methods={methods.data} />;
  }

  return <SiteLayout crumb="Thanh toán">{content}</SiteLayout>;
}

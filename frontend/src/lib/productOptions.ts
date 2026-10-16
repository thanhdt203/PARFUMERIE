import type { GioiTinh, NhomHuong } from '../types/catalog';

export const GIOI_TINH_OPTIONS: ReadonlyArray<{ value: GioiTinh; label: string }> = [
  { value: 'nam', label: 'Nam' },
  { value: 'nu', label: 'Nữ' },
  { value: 'unisex', label: 'Unisex' },
];

export const GIOI_TINH_LABEL: Record<GioiTinh, string> = {
  nam: 'Nam',
  nu: 'Nữ',
  unisex: 'Unisex',
};

export const NHOM_HUONG_OPTIONS: ReadonlyArray<{ value: NhomHuong; label: string }> = [
  { value: 'floral', label: 'Hoa cỏ' },
  { value: 'woody', label: 'Gỗ' },
  { value: 'oriental', label: 'Phương Đông' },
  { value: 'fresh', label: 'Tươi mát' },
  { value: 'citrus', label: 'Cam chanh' },
  { value: 'fruity', label: 'Trái cây' },
  { value: 'aromatic', label: 'Thảo mộc' },
  { value: 'gourmand', label: 'Ngọt ấm' },
  { value: 'chypre', label: 'Chypre' },
  { value: 'musk', label: 'Xạ hương' },
];

/** Giới hạn độ dài khớp với backend (validate ở form trước khi gửi) */
export const PRODUCT_LIMITS = {
  TenSP: 100,
  MoTa: 500,
  ThongTinChiTiet: 2000,
  XuatXu: 50,
  NotHuong: 50,
  DuongDan: 500,
} as const;

/** "cam bergamot, hoa hồng" -> ["cam bergamot", "hoa hồng"] */
export function splitList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Số nguyên không âm dạng chuỗi (giá, tồn kho) */
export function isWholeNumber(text: string): boolean {
  return /^\d+$/.test(text.trim());
}

/** "10ml" -> "Chiết 10ml", "50ml" -> "Fullsize 50ml" (chai chiết từ 20ml trở xuống) */
export function variantLabel(ten: string): string {
  const ml = parseInt(ten, 10);
  if (Number.isNaN(ml)) return ten;
  return ml <= 20 ? `Chiết ${ten}` : `Fullsize ${ten}`;
}

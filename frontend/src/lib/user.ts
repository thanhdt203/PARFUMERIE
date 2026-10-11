import type { Role } from '../context/AuthContext';

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
};

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

// /me trả về NhanVien (HoTenNV, TenDangNhap) hoặc KhachHang (Ho, Ten)
export function getDisplayName(user: Record<string, unknown> | null): string {
  if (!user) return 'Tài khoản';
  const nhanVien = readString(user, 'HoTenNV');
  if (nhanVien) return nhanVien;
  const khachHang = `${readString(user, 'Ho')} ${readString(user, 'Ten')}`.trim();
  if (khachHang) return khachHang;
  return readString(user, 'TenDangNhap') || 'Tài khoản';
}

// Chữ cái đầu của hai từ cuối, dùng cho avatar
export function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const picked = words.length === 1 ? [words[0]] : words.slice(-2);
  return picked
    .map((word) => word.charAt(0))
    .join('')
    .toLocaleUpperCase('vi-VN');
}

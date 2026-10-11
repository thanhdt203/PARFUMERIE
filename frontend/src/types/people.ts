import type { Id, Timestamps } from './common';

export interface KhachHang extends Timestamps {
  _id: Id;
  Ho: string; // tối đa 50
  Ten: string; // tối đa 50
  Email: string; // tối đa 100
  SoDienThoai: string; // tối đa 15
}

export type VaiTroNhanVien = 'staff' | 'admin';

export interface NhanVien extends Timestamps {
  _id: Id;
  HoTenNV: string; // tối đa 50
  TenDangNhap: string; // tối đa 50
  SoDienThoai: string; // tối đa 15
  SoCCCD: string; // tối đa 12
  VaiTro: VaiTroNhanVien;
}

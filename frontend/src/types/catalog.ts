import type { Id, Timestamps } from './common';

// Bám đúng model backend (backend/src/models). Chú thích maxlength để form validate.

export type GioiTinh = 'nam' | 'nu' | 'unisex';

/** Nhóm hương (họ mùi hương) của sản phẩm, trùng danh sách enum ở backend */
export type NhomHuong =
  | 'floral'
  | 'woody'
  | 'oriental'
  | 'fresh'
  | 'citrus'
  | 'fruity'
  | 'aromatic'
  | 'gourmand'
  | 'chypre'
  | 'musk';

/** Nốt hương theo 3 tầng, nằm ngay trong sản phẩm (mỗi nốt là một chuỗi chữ thường) */
export interface NotHuong {
  Dau: string[];
  Giua: string[];
  Cuoi: string[];
}

export interface ThuongHieu extends Timestamps {
  _id: Id;
  TenTH: string; // tối đa 50
  MoTa: string; // tối đa 150
}

export interface DanhMucSanPham extends Timestamps {
  _id: Id;
  TenDM: string; // tối đa 50
  MoTa: string; // tối đa 50
  MaDanhMucCha: Id | null;
}

export interface SanPham extends Timestamps {
  _id: Id;
  TenSP: string; // tối đa 100
  MoTa: string; // tối đa 500
  ThongTinChiTiet: string; // tối đa 2000
  XuatXu: string; // tối đa 50
  GioiTinh: GioiTinh;
  NhomHuong: NhomHuong[];
  NotHuong: NotHuong;
  /** Khoảng giá tự tính từ các biến thể dung tích (backend cập nhật) */
  GiaThapNhat: number;
  GiaCaoNhat: number;
  /** true = ẩn khỏi phía khách hàng */
  DaAn: boolean;
  MaDM: Id;
  MaTH: Id;
}

export interface DungTich extends Timestamps {
  _id: Id;
  TenDungTich: string; // tối đa 20
  MoTa: string; // tối đa 50
}

/** Biến thể sản phẩm + tồn kho */
export interface SanPhamDungTich extends Timestamps {
  _id: Id;
  MaSP: Id;
  MaDungTich: Id;
  SoLuongCo: number;
  Gia: number;
}

export interface HinhAnh extends Timestamps {
  _id: Id;
  DuongDan: string; // tối đa 500
  LoaiHinhAnh: string; // tối đa 50, ví dụ "Ảnh chính"
  LaAnhChinh: boolean;
  ThuTu: number;
  PublicId?: string;
  MaSP: Id;
}
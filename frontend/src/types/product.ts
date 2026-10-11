import type { Id, IsoDate } from './common';
import type { GioiTinh, NhomHuong, NotHuong } from './catalog';

// Dạng dữ liệu API quản trị sản phẩm trả về / nhận vào (backend: /api/admin/products)

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

export interface RefThuongHieu {
  _id: Id;
  TenTH: string;
}
export interface RefDanhMuc {
  _id: Id;
  TenDM: string;
}
export interface RefDungTich {
  _id: Id;
  TenDungTich: string;
}

export type TrangThaiFilter = 'all' | 'hien' | 'an';

/** Một dòng trong danh sách quản trị */
export interface AdminProductRow {
  _id: Id;
  TenSP: string;
  GioiTinh: GioiTinh;
  GiaThapNhat: number;
  GiaCaoNhat: number;
  DaAn: boolean;
  ThuongHieu: RefThuongHieu | null;
  DanhMuc: RefDanhMuc | null;
  /** Tổng tồn kho của mọi biến thể */
  TongTon: number;
}

export interface ProductVariant {
  _id: Id;
  DungTich: RefDungTich | null;
  Gia: number;
  SoLuongCo: number;
  ConHang: boolean;
}

export interface ProductImage {
  _id: Id;
  DuongDan: string;
  LaAnhChinh: boolean;
  ThuTu: number;
}

export interface AdminProductDetail {
  _id: Id;
  TenSP: string;
  MoTa: string;
  ThongTinChiTiet: string;
  XuatXu: string;
  GioiTinh: GioiTinh;
  NhomHuong: NhomHuong[];
  NotHuong: NotHuong;
  GiaThapNhat: number;
  GiaCaoNhat: number;
  DaAn: boolean;
  ThuongHieu: RefThuongHieu | null;
  DanhMuc: RefDanhMuc | null;
  BienThe: ProductVariant[];
  HinhAnh: ProductImage[];
  TongTon: number;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** Các trường thông tin sản phẩm gửi lên khi thêm / sửa */
export interface ProductInput {
  TenSP: string;
  MoTa: string;
  ThongTinChiTiet: string;
  XuatXu: string;
  GioiTinh: GioiTinh;
  NhomHuong: NhomHuong[];
  NotHuong: NotHuong;
  MaTH: Id;
  MaDM: Id;
}

export interface VariantCreateInput {
  MaDungTich: Id;
  SoLuongCo: number;
  Gia: number;
}

export interface ProductCreateInput extends ProductInput {
  BienThe?: VariantCreateInput[];
  HinhAnh?: Array<{ DuongDan: string }>;
}

export interface VariantUpdateInput {
  SoLuongCo?: number;
  Gia?: number;
}

export interface ProductListParams {
  page: number;
  limit: number;
  q: string;
  trangthai: TrangThaiFilter;
}
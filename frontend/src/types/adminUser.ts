import type { Id, IsoDate } from './common';
import type { Paged } from './product';

// Dạng dữ liệu API quản lý người dùng trả về (backend: /api/admin/users). Chỉ admin dùng.

/** customer = Khách hàng | staff = Quản lý (nhân viên) | admin = Quản trị viên */
export type UserRole = 'customer' | 'staff' | 'admin';

/** Vai trò có thể gán cho nhân viên (khách hàng không đổi sang nhân viên ở đây) */
export type StaffRole = 'staff' | 'admin';

export type UserStatusFilter = 'all' | 'hoatdong' | 'khoa';

export interface AdminUserRow {
  _id: Id;
  HoTen: string;
  Email: string | null;
  SoDienThoai: string;
  NgaySinh: IsoDate | null;
  DiaChi: string | null;
  VaiTro: UserRole;
  BiKhoa: boolean;
  createdAt: IsoDate;
}

export type UserListResponse = Paged<AdminUserRow>;

export interface UserListParams {
  page: number;
  limit: number;
  q: string;
  vaitro: UserRole | 'all';
  trangthai: UserStatusFilter;
}

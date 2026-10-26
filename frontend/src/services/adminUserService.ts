import api from '../lib/api';
import type { StaffRole, UserListParams, UserListResponse } from '../types/adminUser.ts';

const BASE = '/admin/users';

interface MessageResponse {
  message: string;
}

// API quản lý người dùng (chỉ admin)
export const adminUserService = {
  async list({ page, limit, q, vaitro, trangthai }: UserListParams): Promise<UserListResponse> {
    const { data } = await api.get<UserListResponse>(BASE, {
      params: {
        page,
        limit,
        q: q || undefined,
        vaitro: vaitro === 'all' ? undefined : vaitro,
        trangthai: trangthai === 'all' ? undefined : trangthai,
      },
    });
    return data;
  },

  /** Đổi quyền nhân viên <-> admin. Backend từ chối đổi quyền chính mình / hạ admin cuối cùng. */
  async updateRole(id: string, vaiTro: StaffRole): Promise<string> {
    const { data } = await api.patch<MessageResponse>(`${BASE}/${id}/role`, { VaiTro: vaiTro });
    return data.message;
  },

  /** Khóa / mở khóa. Khóa sẽ đăng xuất người dùng khỏi mọi thiết bị. */
  async setLocked(id: string, biKhoa: boolean): Promise<string> {
    const { data } = await api.patch<MessageResponse>(`${BASE}/${id}/status`, { BiKhoa: biKhoa });
    return data.message;
  },

  /** Hệ thống tạo mật khẩu mới và gửi tới email người dùng (admin không thấy mật khẩu). */
  async resetPassword(id: string): Promise<string> {
    const { data } = await api.post<MessageResponse>(`${BASE}/${id}/reset-password`);
    return data.message;
  },
};

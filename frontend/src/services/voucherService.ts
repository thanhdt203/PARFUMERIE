import api from '../lib/api';
import type { AdminVoucher, VoucherInput, VoucherListParams, VoucherListResponse } from '../types/voucher.ts';

interface DataResponse<T> {
  message?: string;
  data: T;
}

const BASE = '/admin/vouchers';

// API quản trị voucher (nhân viên và admin đều dùng được, riêng xóa chỉ admin)
export const voucherService = {
  async list({ page, limit, q, trangthai }: VoucherListParams): Promise<VoucherListResponse> {
    const { data } = await api.get<VoucherListResponse>(BASE, {
      params: { page, limit, q: q || undefined, trangthai: trangthai === 'all' ? undefined : trangthai },
    });
    return data;
  },

  async create(body: VoucherInput): Promise<AdminVoucher> {
    const { data } = await api.post<DataResponse<AdminVoucher>>(BASE, body);
    return data.data;
  },

  /**
   * Voucher đã nằm trong đơn hàng thì backend từ chối đổi mã / mức giảm (409).
   * Số lượt không được nhỏ hơn số lượt đã dùng (400).
   */
  async update(id: string, body: Partial<VoucherInput>): Promise<AdminVoucher> {
    const { data } = await api.put<DataResponse<AdminVoucher>>(`${BASE}/${id}`, body);
    return data.data;
  },

  /** Bật / tắt nhanh, không đụng tới các trường khác */
  setActive(id: string, dangBat: boolean): Promise<AdminVoucher> {
    return voucherService.update(id, { DangBat: dangBat });
  },

  /** Chỉ admin. Voucher đã được dùng trong đơn hàng sẽ bị từ chối (409), hãy tắt thay vì xóa. */
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};

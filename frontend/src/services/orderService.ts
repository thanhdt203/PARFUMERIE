import api from '../lib/api';
import type {
  AdminOrderDetail,
  OrderFilterParams,
  OrderListParams,
  OrderListResponse,
} from '../types/order';
import type { TrangThaiDonHang } from '../types/sales';

interface DataResponse<T> {
  message?: string;
  data: T;
}

const BASE = '/admin/orders';

/** Bỏ các bộ lọc rỗng / "all" để URL gọn */
function toQuery({ q, trangthai, tu, den }: OrderFilterParams) {
  return {
    q: q || undefined,
    trangthai: trangthai === 'all' ? undefined : trangthai,
    tu: tu || undefined,
    den: den || undefined,
  };
}

// API quản trị đơn hàng (nhân viên và admin đều dùng được)
export const orderService = {
  async list({ page, limit, ...filters }: OrderListParams): Promise<OrderListResponse> {
    const { data } = await api.get<OrderListResponse>(BASE, {
      params: { page, limit, ...toQuery(filters) },
    });
    return data;
  },

  async get(id: string): Promise<AdminOrderDetail> {
    const { data } = await api.get<DataResponse<AdminOrderDetail>>(`${BASE}/${id}`);
    return data.data;
  },

  /** Backend kiểm tra thứ tự chuyển trạng thái; chuyển sai sẽ trả 409. Hủy đơn sẽ cộng lại kho. */
  async updateStatus(id: string, trangThai: TrangThaiDonHang): Promise<AdminOrderDetail> {
    const { data } = await api.patch<DataResponse<AdminOrderDetail>>(`${BASE}/${id}/trangthai`, {
      TrangThai: trangThai,
    });
    return data.data;
  },

  /** Tải file CSV theo bộ lọc hiện tại (tối đa 5000 đơn mới nhất) */
  async exportCsv(filters: OrderFilterParams): Promise<void> {
    const response = await api.get<Blob>(`${BASE}/export`, {
      params: toQuery(filters),
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

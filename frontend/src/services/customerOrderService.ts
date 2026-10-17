import api from '../lib/api';
import type {
  CreatedOrder,
  CreateOrderInput,
  MyOrder,
  MyOrderListResponse,
  PaymentMethod,
  VoucherPreview,
} from '../types/customerOrder';

const BASE = '/me/orders';

// API đơn hàng của khách (chỉ tài khoản customer).
// Lưu ý: cần VITE_USE_MOCK=false, vì giỏ mock không tồn tại trên server nên không đặt hàng được.
export const customerOrderService = {
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await api.get<{ data: PaymentMethod[] }>(`${BASE}/payment-methods`);
    return data.data;
  },

  /** Kiểm tra mã giảm giá trên giỏ hàng hiện tại. Mã sai/hết hạn -> ném lỗi 400 kèm message */
  async previewVoucher(maCode: string): Promise<VoucherPreview> {
    const { data } = await api.post<{ data: VoucherPreview }>(`${BASE}/voucher/preview`, { MaCode: maCode });
    return data.data;
  },

  async create(input: CreateOrderInput): Promise<CreatedOrder> {
    const { data } = await api.post<{ data: CreatedOrder }>(BASE, input);
    return data.data;
  },

  async list(page: number, limit = 10): Promise<MyOrderListResponse> {
    const { data } = await api.get<MyOrderListResponse>(BASE, { params: { page, limit } });
    return data;
  },

  async get(id: string): Promise<MyOrder> {
    const { data } = await api.get<{ data: MyOrder }>(`${BASE}/${id}`);
    return data.data;
  },

  async cancel(id: string): Promise<void> {
    await api.patch(`${BASE}/${id}/huy`);
  },
};

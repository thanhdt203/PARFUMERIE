import api from '../lib/api';
import type { InventoryListParams, InventoryListResponse, InventoryRow, StockAdjustInput } from '../types/inventory.ts';

interface DataResponse<T> {
  message?: string;
  data: T;
}

const BASE = '/admin/inventory';

// API quản trị kho hàng (nhân viên và admin đều dùng được)
export const inventoryService = {
  async list({ page, limit, q, trangthai, nguong }: InventoryListParams): Promise<InventoryListResponse> {
    const { data } = await api.get<InventoryListResponse>(BASE, {
      params: { page, limit, q: q || undefined, trangthai: trangthai === 'all' ? undefined : trangthai, nguong },
    });
    return data;
  },

  /**
   * ThayDoi cộng/trừ vào tồn hiện tại (an toàn khi có khách đang đặt hàng); trừ quá tồn sẽ bị từ chối (409).
   * SoLuongCo đặt lại đúng số lượng (dùng khi kiểm kê).
   */
  async adjust(id: string, input: StockAdjustInput): Promise<InventoryRow> {
    const { data } = await api.patch<DataResponse<InventoryRow>>(`${BASE}/${id}`, input);
    return data.data;
  },
};

import api from '../lib/api';
import type {
  AdminProductDetail,
  AdminProductRow,
  Paged,
  ProductCreateInput,
  ProductInput,
  ProductListParams,
  VariantCreateInput,
  VariantUpdateInput,
} from '../types/product';

interface DataResponse<T> {
  message?: string;
  data: T;
}

const BASE = '/admin/products';

// API quản trị sản phẩm (backend có sẵn nên gọi thẳng, không dùng mock)
export const productService = {
  async list({ page, limit, q, trangthai }: ProductListParams): Promise<Paged<AdminProductRow>> {
    const { data } = await api.get<Paged<AdminProductRow>>(BASE, {
      params: { page, limit, q: q || undefined, trangthai },
    });
    return data;
  },

  async get(id: string): Promise<AdminProductDetail> {
    const { data } = await api.get<DataResponse<AdminProductDetail>>(`${BASE}/${id}`);
    return data.data;
  },

  async create(input: ProductCreateInput): Promise<AdminProductDetail> {
    const { data } = await api.post<DataResponse<AdminProductDetail>>(BASE, input);
    return data.data;
  },

  /** Chỉ cần gửi các trường muốn sửa */
  async update(id: string, input: Partial<ProductInput>): Promise<AdminProductDetail> {
    const { data } = await api.put<DataResponse<AdminProductDetail>>(`${BASE}/${id}`, input);
    return data.data;
  },

  async setHidden(id: string, daAn: boolean): Promise<void> {
    await api.patch(`${BASE}/${id}/an`, { DaAn: daAn });
  },

  /** Chỉ admin. Sản phẩm đã có trong đơn hàng sẽ bị từ chối (409), khi đó hãy ẩn sản phẩm. */
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addVariant(id: string, input: VariantCreateInput): Promise<AdminProductDetail> {
    const { data } = await api.post<DataResponse<AdminProductDetail>>(`${BASE}/${id}/bienthe`, input);
    return data.data;
  },

  async updateVariant(id: string, variantId: string, input: VariantUpdateInput): Promise<AdminProductDetail> {
    const { data } = await api.put<DataResponse<AdminProductDetail>>(`${BASE}/${id}/bienthe/${variantId}`, input);
    return data.data;
  },

  /** Chỉ admin */
  async removeVariant(id: string, variantId: string): Promise<void> {
    await api.delete(`${BASE}/${id}/bienthe/${variantId}`);
  },
};
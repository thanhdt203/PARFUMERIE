import api from '../lib/api';
import type { AdminCustomerDetail, CustomerListParams, CustomerListResponse } from '../types/adminCustomer';

const BASE = '/admin/customers';

// API quản trị khách hàng (nhân viên và admin đều xem được)
export const adminCustomerService = {
  async list({ page, limit, q, sapxep }: CustomerListParams): Promise<CustomerListResponse> {
    const { data } = await api.get<CustomerListResponse>(BASE, {
      params: { page, limit, q: q || undefined, sapxep: sapxep === 'moi' ? undefined : sapxep },
    });
    return data;
  },

  async get(id: string): Promise<AdminCustomerDetail> {
    const { data } = await api.get<{ data: AdminCustomerDetail }>(`${BASE}/${id}`);
    return data.data;
  },
};

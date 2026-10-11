import type { PhuongThucThanhToan } from '../types/sales';

const NGAY_TAO = '2024-06-01T08:00:00.000Z';

export const PHUONG_THUC_THANH_TOAN: PhuongThucThanhToan[] = [
  { _id: 'pt01', TenPTTT: 'Thanh toán khi nhận hàng (COD)', createdAt: NGAY_TAO, updatedAt: NGAY_TAO },
  { _id: 'pt02', TenPTTT: 'Chuyển khoản ngân hàng', createdAt: NGAY_TAO, updatedAt: NGAY_TAO },
  { _id: 'pt03', TenPTTT: 'Ví MoMo', createdAt: NGAY_TAO, updatedAt: NGAY_TAO },
];

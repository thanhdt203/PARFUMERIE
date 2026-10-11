import type { Voucher } from '../types/sales';

const NGAY_TAO = '2024-06-01T08:00:00.000Z';

// Giai đoạn 4 sẽ mở rộng (mã, loại, lượt dùng) bằng type "chờ backend"
export const VOUCHER: Voucher[] = [
  { _id: 'vc01', GiaTri: 50000, NgayBatDau: '2024-01-01T00:00:00.000Z', NgayKetThuc: '2028-12-31T23:59:59.000Z', createdAt: NGAY_TAO, updatedAt: NGAY_TAO },
  { _id: 'vc02', GiaTri: 100000, NgayBatDau: '2024-01-01T00:00:00.000Z', NgayKetThuc: '2028-12-31T23:59:59.000Z', createdAt: NGAY_TAO, updatedAt: NGAY_TAO },
  { _id: 'vc03', GiaTri: 200000, NgayBatDau: '2024-01-01T00:00:00.000Z', NgayKetThuc: '2028-12-31T23:59:59.000Z', createdAt: NGAY_TAO, updatedAt: NGAY_TAO },
];

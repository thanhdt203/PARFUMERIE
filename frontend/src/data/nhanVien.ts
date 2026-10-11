import type { NhanVien } from '../types/people';

const NGAY_TAO = '2024-06-01T08:00:00.000Z';

export const NHAN_VIEN: NhanVien[] = [
  {
    _id: 'nv01',
    HoTenNV: 'Nguyễn Văn A',
    TenDangNhap: 'nva',
    SoDienThoai: '0900000001',
    SoCCCD: '079123456789',
    VaiTro: 'admin',
    createdAt: NGAY_TAO,
    updatedAt: NGAY_TAO,
  },
  {
    _id: 'nv02',
    HoTenNV: 'Lê Thị Hoa',
    TenDangNhap: 'lthoa',
    SoDienThoai: '0900000003',
    SoCCCD: '079200000002',
    VaiTro: 'staff',
    createdAt: NGAY_TAO,
    updatedAt: NGAY_TAO,
  },
  {
    _id: 'nv03',
    HoTenNV: 'Trần Minh Quân',
    TenDangNhap: 'tmquan',
    SoDienThoai: '0900000004',
    SoCCCD: '079200000003',
    VaiTro: 'staff',
    createdAt: NGAY_TAO,
    updatedAt: NGAY_TAO,
  },
];

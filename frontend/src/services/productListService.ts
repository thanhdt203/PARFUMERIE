import api from '../lib/api';
import { SAN_PHAM } from '../data/sanPham';
import { SAN_PHAM_DUNG_TICH } from '../data/sanPhamDungTich';
import { THUONG_HIEU } from '../data/thuongHieu';
import type { ProductCardData } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export type ProductSort = 'moi' | 'pho_bien' | 'gia_tang' | 'gia_giam' | 'ten';

/** Điều kiện lấy danh sách ở trang /nuoc-hoa (khớp tham số GET /api/products) */
export interface ProductListParams {
  /** Mã danh mục (đã gồm cả danh mục con nếu có) */
  danhmuc: string[];
  thuonghieu: string[];
  nhomhuong: string[];
  /** Giá tối đa (đ); undefined = không giới hạn */
  giaden?: number;
  sort: ProductSort;
  /** Bắt đầu từ 1 */
  page: number;
}

export interface ProductListResult {
  items: ProductCardData[];
  total: number;
  totalPages: number;
}

export const PAGE_SIZE = 12;

// Dạng một sản phẩm trong GET /api/products (chỉ khai báo phần cần dùng)
interface ApiProduct {
  _id: string;
  TenSP: string;
  GiaThapNhat: number;
  GiaCaoNhat: number;
  AnhChinh: string | null;
  ThuongHieu?: { _id: string; TenTH: string } | null;
}

interface ApiListResponse {
  data: ApiProduct[];
  pagination: { total: number; totalPages: number };
}

const apiList = async (p: ProductListParams): Promise<ProductListResult> => {
  const { data } = await api.get<ApiListResponse>('/products', {
    params: {
      page: p.page,
      limit: PAGE_SIZE,
      sort: p.sort,
      conhang: true,
      // backend nhận nhiều giá trị cách nhau bằng dấu phẩy; để trống thì không gửi
      danhmuc: p.danhmuc.join(',') || undefined,
      thuonghieu: p.thuonghieu.join(',') || undefined,
      nhomhuong: p.nhomhuong.join(',') || undefined,
      giaden: p.giaden,
    },
  });
  return {
    items: data.data.map((sp) => ({
      _id: sp._id,
      TenSP: sp.TenSP,
      TenThuongHieu: sp.ThuongHieu?.TenTH ?? '',
      GiaThapNhat: sp.GiaThapNhat,
      GiaCaoNhat: sp.GiaCaoNhat,
      AnhChinh: sp.AnhChinh,
    })),
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
  };
};

// Mock: lọc / sắp xếp / phân trang ngay trên dữ liệu có sẵn trong src/data
const mockList = async (p: ProductListParams): Promise<ProductListResult> => {
  await mockDelay();
  const tenTH = new Map(THUONG_HIEU.map((th) => [th._id, th.TenTH]));

  const rows = SAN_PHAM.filter((sp) => !sp.DaAn)
    .filter((sp) => p.danhmuc.length === 0 || p.danhmuc.includes(sp.MaDM))
    .filter((sp) => p.thuonghieu.length === 0 || p.thuonghieu.includes(sp.MaTH))
    .filter((sp) => p.nhomhuong.length === 0 || p.nhomhuong.some((h) => sp.NhomHuong.includes(h as never)))
    .map((sp, order) => {
      const gia = SAN_PHAM_DUNG_TICH.filter((b) => b.MaSP === sp._id).map((b) => b.Gia);
      const card: ProductCardData = {
        _id: sp._id,
        TenSP: sp.TenSP,
        TenThuongHieu: tenTH.get(sp.MaTH) ?? '',
        GiaThapNhat: gia.length ? Math.min(...gia) : 0,
        GiaCaoNhat: gia.length ? Math.max(...gia) : 0,
        AnhChinh: null,
      };
      return { card, order };
    })
    .filter(({ card }) => p.giaden === undefined || card.GiaThapNhat <= p.giaden);

  const byName = (a: ProductCardData, b: ProductCardData) => a.TenSP.localeCompare(b.TenSP, 'vi', { sensitivity: 'base' });
  rows.sort((a, b) => {
    switch (p.sort) {
      case 'gia_tang':
        return a.card.GiaThapNhat - b.card.GiaThapNhat;
      case 'gia_giam':
        return b.card.GiaThapNhat - a.card.GiaThapNhat;
      case 'ten':
        return byName(a.card, b.card);
      case 'pho_bien':
        return a.order - b.order;
      default: // moi: mock coi sản phẩm thêm sau cùng là mới nhất
        return b.order - a.order;
    }
  });

  const start = (p.page - 1) * PAGE_SIZE;
  return {
    items: rows.slice(start, start + PAGE_SIZE).map((r) => r.card),
    total: rows.length,
    totalPages: Math.ceil(rows.length / PAGE_SIZE),
  };
};

export const productListService = {
  list: (p: ProductListParams): Promise<ProductListResult> => (USE_MOCK ? mockList(p) : apiList(p)),
};
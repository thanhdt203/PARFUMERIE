import api from '../lib/api';
import { SAN_PHAM } from '../data/sanPham';
import { SAN_PHAM_DUNG_TICH } from '../data/sanPhamDungTich';
import { THUONG_HIEU } from '../data/thuongHieu';
import type { ProductCardData, ProductSection } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export interface ShopService {
  getSections(): Promise<ProductSection[]>;
}

const SO_SP_MOI_MUC = 10;

// Mock: ghép sản phẩm + thương hiệu + biến thể có sẵn trong src/data để tính khoảng giá
function getAllMockProducts(): ProductCardData[] {
  const tenTH = new Map(THUONG_HIEU.map((th) => [th._id, th.TenTH]));
  return SAN_PHAM.filter((sp) => !sp.DaAn).map((sp) => {
    const gia = SAN_PHAM_DUNG_TICH.filter((bt) => bt.MaSP === sp._id).map((bt) => bt.Gia);
    return {
      _id: sp._id,
      TenSP: sp.TenSP,
      TenThuongHieu: tenTH.get(sp.MaTH) ?? '',
      GiaThapNhat: gia.length ? Math.min(...gia) : 0,
      GiaCaoNhat: gia.length ? Math.max(...gia) : 0,
      AnhChinh: null,
    };
  });
}

const mockService: ShopService = {
  async getSections() {
    await mockDelay();
    const all = getAllMockProducts();
    return [
      // mock chưa có số liệu tìm kiếm nên lấy tạm các sản phẩm đầu danh sách
      { key: 'top-tim-kiem', title: 'Top tìm kiếm', to: '/nuoc-hoa', products: all.slice(0, SO_SP_MOI_MUC) },
      // mock: sản phẩm thêm sau cùng coi là mới nhất
      { key: 'san-pham-moi', title: 'Sản phẩm mới', to: '/nuoc-hoa', products: [...all].reverse().slice(0, SO_SP_MOI_MUC) },
    ];
  },
};

// Dạng một sản phẩm trong GET /api/products (chỉ khai báo phần cần dùng)
interface ApiProduct {
  _id: string;
  TenSP: string;
  GiaThapNhat: number;
  GiaCaoNhat: number;
  AnhChinh: string | null;
  ThuongHieu?: { _id: string; TenTH: string } | null;
}

const TOP_SORT = 'ten';

async function fetchProducts(sort: string): Promise<ProductCardData[]> {
  const { data } = await api.get<{ data: ApiProduct[] }>('/products', {
    params: { sort, limit: SO_SP_MOI_MUC, conhang: true },
  });
  return data.data.map((sp) => ({
    _id: sp._id,
    TenSP: sp.TenSP,
    TenThuongHieu: sp.ThuongHieu?.TenTH ?? '',
    GiaThapNhat: sp.GiaThapNhat,
    GiaCaoNhat: sp.GiaCaoNhat,
    AnhChinh: sp.AnhChinh,
  }));
}

const apiService: ShopService = {
  async getSections() {
    const [top, moi] = await Promise.all([fetchProducts(TOP_SORT), fetchProducts('moi')]);
    return [
      { key: 'top-tim-kiem', title: 'Top tìm kiếm', to: '/nuoc-hoa', products: top },
      { key: 'san-pham-moi', title: 'Sản phẩm mới', to: '/nuoc-hoa', products: moi },
    ];
  },
};

export const shopService: ShopService = USE_MOCK ? mockService : apiService;
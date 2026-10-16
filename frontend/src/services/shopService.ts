import api from '../lib/api';
import { SAN_PHAM } from '../data/sanPham';
import { SAN_PHAM_DUNG_TICH } from '../data/sanPhamDungTich';
import { THUONG_HIEU } from '../data/thuongHieu';
import { DANH_MUC } from '../data/danhMuc';
import { DUNG_TICH } from '../data/dungTich';
import type { FilterOptions, ProductCardData, ProductDetailData, ProductFilters, ProductSection } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export interface ShopService {
  getSections(): Promise<ProductSection[]>;
  getProduct(id: string): Promise<ProductDetailData>;
  /** Sản phẩm cùng danh mục (bỏ chính nó) */
  getRelated(product: ProductDetailData): Promise<ProductCardData[]>;
  /** Các lựa chọn cho thanh lọc */
  getFilterOptions(): Promise<FilterOptions>;
  /** Lọc sản phẩm (dùng khi người dùng đã chọn ít nhất một bộ lọc) */
  searchProducts(filters: ProductFilters): Promise<ProductCardData[]>;
}

const SO_SP_LIEN_QUAN = 4;
const SO_SP_KET_QUA = 24;
const GIOI_TINH = ['nam', 'nu', 'unisex'];
const NHOM_HUONG = ['floral', 'woody', 'oriental', 'fresh', 'citrus', 'fruity', 'aromatic', 'gourmand', 'chypre', 'musk'];

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
      GioiTinh: sp.GioiTinh,
      NhomHuong: sp.NhomHuong,
    };
  });
}

const mockService: ShopService = {
  async getFilterOptions() {
    await mockDelay();
    const gia = getAllMockProducts().map((p) => p.GiaCaoNhat);
    return { GioiTinh: GIOI_TINH, NhomHuong: NHOM_HUONG, KhoangGia: { min: 0, max: gia.length ? Math.max(...gia) : 0 } };
  },
  async searchProducts(f) {
    await mockDelay();
    return getAllMockProducts()
      .filter((p) => f.gioitinh.length === 0 || f.gioitinh.includes(p.GioiTinh ?? ''))
      .filter((p) => f.nhomhuong.length === 0 || f.nhomhuong.some((h) => p.NhomHuong?.includes(h)))
      .filter((p) => f.giaden === undefined || p.GiaThapNhat <= f.giaden)
      .slice(0, SO_SP_KET_QUA);
  },
  async getProduct(id) {
    await mockDelay();
    const sp = SAN_PHAM.find((x) => x._id === id && !x.DaAn);
    if (!sp) throw new Error('Không tìm thấy sản phẩm');
    const th = THUONG_HIEU.find((t) => t._id === sp.MaTH);
    const dm = DANH_MUC.find((d) => d._id === sp.MaDM);
    const tenDT = new Map(DUNG_TICH.map((d) => [d._id, d.TenDungTich]));
    return {
      _id: sp._id,
      TenSP: sp.TenSP,
      MoTa: sp.MoTa,
      ThongTinChiTiet: sp.ThongTinChiTiet,
      XuatXu: sp.XuatXu,
      GioiTinh: sp.GioiTinh,
      NhomHuong: sp.NhomHuong,
      NotHuong: sp.NotHuong,
      ThuongHieu: th ? { _id: th._id, TenTH: th.TenTH } : null,
      DanhMuc: dm ? { _id: dm._id, TenDM: dm.TenDM } : null,
      BienThe: SAN_PHAM_DUNG_TICH.filter((b) => b.MaSP === id)
        .sort((a, b) => a.Gia - b.Gia)
        .map((b) => ({
          _id: b._id,
          TenDungTich: tenDT.get(b.MaDungTich) ?? '',
          Gia: b.Gia,
          SoLuongCo: b.SoLuongCo,
          ConHang: b.SoLuongCo > 0,
        })),
      HinhAnh: [],
    };
  },
  async getRelated(product) {
    await mockDelay();
    const maDM = SAN_PHAM.find((x) => x._id === product._id)?.MaDM;
    return getAllMockProducts()
      .filter((p) => p._id !== product._id && SAN_PHAM.find((x) => x._id === p._id)?.MaDM === maDM)
      .slice(0, SO_SP_LIEN_QUAN);
  },
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

interface ApiProductDetail extends Omit<ProductDetailData, 'BienThe'> {
  BienThe: Array<{
    _id: string;
    DungTich: { _id: string; TenDungTich: string } | null;
    Gia: number;
    SoLuongCo: number;
    ConHang: boolean;
  }>;
}

const apiService: ShopService = {
  async getFilterOptions() {
    const { data } = await api.get<{ data: FilterOptions }>('/products/filters');
    return data.data;
  },
  async searchProducts(f) {
    const { data } = await api.get<{ data: ApiProduct[] }>('/products', {
      params: {
        sort: 'moi',
        limit: SO_SP_KET_QUA,
        conhang: true,
        // backend nhận nhiều giá trị cách nhau bằng dấu phẩy; để trống thì không gửi
        gioitinh: f.gioitinh.join(',') || undefined,
        nhomhuong: f.nhomhuong.join(',') || undefined,
        giaden: f.giaden,
      },
    });
    return data.data.map((sp) => ({
      _id: sp._id,
      TenSP: sp.TenSP,
      TenThuongHieu: sp.ThuongHieu?.TenTH ?? '',
      GiaThapNhat: sp.GiaThapNhat,
      GiaCaoNhat: sp.GiaCaoNhat,
      AnhChinh: sp.AnhChinh,
    }));
  },
  async getProduct(id) {
    const { data } = await api.get<{ data: ApiProductDetail }>(`/products/${id}`);
    const sp = data.data;
    return {
      ...sp,
      BienThe: sp.BienThe.map((b) => ({
        _id: b._id,
        TenDungTich: b.DungTich?.TenDungTich ?? '',
        Gia: b.Gia,
        SoLuongCo: b.SoLuongCo,
        ConHang: b.ConHang,
      })),
    };
  },
  async getRelated(product) {
    if (!product.DanhMuc) return [];
    const { data } = await api.get<{ data: ApiProduct[] }>('/products', {
      params: { danhmuc: product.DanhMuc._id, limit: SO_SP_LIEN_QUAN + 1, conhang: true },
    });
    return data.data
      .filter((sp) => sp._id !== product._id)
      .slice(0, SO_SP_LIEN_QUAN)
      .map((sp) => ({
        _id: sp._id,
        TenSP: sp.TenSP,
        TenThuongHieu: sp.ThuongHieu?.TenTH ?? '',
        GiaThapNhat: sp.GiaThapNhat,
        GiaCaoNhat: sp.GiaCaoNhat,
        AnhChinh: sp.AnhChinh,
      }));
  },
  async getSections() {
    const [top, moi] = await Promise.all([fetchProducts(TOP_SORT), fetchProducts('moi')]);
    return [
      { key: 'top-tim-kiem', title: 'Top tìm kiếm', to: '/nuoc-hoa', products: top },
      { key: 'san-pham-moi', title: 'Sản phẩm mới', to: '/nuoc-hoa', products: moi },
    ];
  },
};

export const shopService: ShopService = USE_MOCK ? mockService : apiService;
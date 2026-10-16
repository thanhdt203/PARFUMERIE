import api from '../lib/api';
import { SAN_PHAM } from '../data/sanPham';
import { SAN_PHAM_DUNG_TICH } from '../data/sanPhamDungTich';
import { THUONG_HIEU } from '../data/thuongHieu';
import { DUNG_TICH } from '../data/dungTich';
import type { CartData, CartItem } from '../types/cart';
import { mockDelay, USE_MOCK } from './config';

/** Mỗi dòng giỏ tối đa bấy nhiêu chai (khớp backend và trang chi tiết) */
export const MAX_CART_QTY = 10;

export interface CartService {
  getCart(): Promise<CartData>;
  /** Thêm vào giỏ, đã có thì cộng dồn. Trả về giỏ mới. */
  addItem(maSPDungTich: string, soLuong: number): Promise<CartData>;
  updateQty(itemId: string, soLuong: number): Promise<CartData>;
  removeItem(itemId: string): Promise<CartData>;
}

const summarize = (items: CartItem[]): CartData => ({
  items,
  tongSoLuong: items.reduce((sum, i) => sum + i.SoLuongChonMua, 0),
  tamTinh: items.reduce((sum, i) => sum + i.Gia * i.SoLuongChonMua, 0),
});

// ---------- Mock: giỏ nằm trong bộ nhớ, tải lại trang là mất ----------
let mockLines: Array<{ _id: string; MaSPDungTich: string; SoLuongChonMua: number }> = [];
let mockSeq = 1;

function mockCart(): CartData {
  const items: CartItem[] = [];
  for (const line of mockLines) {
    const bt = SAN_PHAM_DUNG_TICH.find((b) => b._id === line.MaSPDungTich);
    const sp = bt && SAN_PHAM.find((s) => s._id === bt.MaSP);
    if (!bt || !sp) continue;
    items.push({
      _id: line._id,
      MaSPDungTich: bt._id,
      MaSP: sp._id,
      TenSP: sp.TenSP,
      TenThuongHieu: THUONG_HIEU.find((t) => t._id === sp.MaTH)?.TenTH ?? '',
      GioiTinh: sp.GioiTinh,
      XuatXu: sp.XuatXu,
      TenDungTich: DUNG_TICH.find((d) => d._id === bt.MaDungTich)?.TenDungTich ?? '',
      AnhChinh: null,
      Gia: bt.Gia,
      SoLuongChonMua: line.SoLuongChonMua,
      SoLuongCo: bt.SoLuongCo,
    });
  }
  return summarize(items);
}

const mockService: CartService = {
  async getCart() {
    await mockDelay(200);
    return mockCart();
  },
  async addItem(maSPDungTich, soLuong) {
    await mockDelay(200);
    const bt = SAN_PHAM_DUNG_TICH.find((b) => b._id === maSPDungTich);
    if (!bt) throw new Error('Không tìm thấy sản phẩm');
    const limit = Math.min(MAX_CART_QTY, bt.SoLuongCo);
    const line = mockLines.find((l) => l.MaSPDungTich === maSPDungTich);
    const next = (line?.SoLuongChonMua ?? 0) + soLuong;
    if (next > limit) throw new Error(`Mỗi sản phẩm chỉ mua tối đa ${limit}`);
    if (line) line.SoLuongChonMua = next;
    else {
      mockLines = [...mockLines, { _id: `gh${mockSeq}`, MaSPDungTich: maSPDungTich, SoLuongChonMua: soLuong }];
      mockSeq += 1;
    }
    return mockCart();
  },
  async updateQty(itemId, soLuong) {
    await mockDelay(150);
    mockLines = mockLines.map((l) => (l._id === itemId ? { ...l, SoLuongChonMua: soLuong } : l));
    return mockCart();
  },
  async removeItem(itemId) {
    await mockDelay(150);
    mockLines = mockLines.filter((l) => l._id !== itemId);
    return mockCart();
  },
};

// ---------- API thật: /api/me/cart (chỉ tài khoản customer) ----------
const apiService: CartService = {
  async getCart() {
    const { data } = await api.get<{ data: CartData }>('/me/cart');
    return data.data;
  },
  async addItem(maSPDungTich, soLuong) {
    const { data } = await api.post<{ data: CartData }>('/me/cart', {
      MaSPDungTich: maSPDungTich,
      SoLuongChonMua: soLuong,
    });
    return data.data;
  },
  async updateQty(itemId, soLuong) {
    const { data } = await api.patch<{ data: CartData }>(`/me/cart/${itemId}`, { SoLuongChonMua: soLuong });
    return data.data;
  },
  async removeItem(itemId) {
    const { data } = await api.delete<{ data: CartData }>(`/me/cart/${itemId}`);
    return data.data;
  },
};

export const cartService: CartService = USE_MOCK ? mockService : apiService;

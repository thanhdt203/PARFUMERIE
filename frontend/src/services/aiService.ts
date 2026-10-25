import api from '../lib/api';
import { NHOM_HUONG_OPTIONS } from '../lib/productOptions';
import { shopService } from './shopService';
import type { AiMessage, AiProduct, AiReply } from '../types/ai';
import type { ProductDetailData } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export type { AiReply } from '../types/ai';

export interface AiService {
  /** Gửi câu hỏi kèm lịch sử chat; trả về câu trả lời của AI */
  ask(message: string, history: AiMessage[]): Promise<AiReply>;
}

const MAX_HISTORY = 10;
const DEFAULT_SUGGESTIONS = ['Mùi nào lưu hương lâu nhất?', 'So sánh 3 mùi này', 'Có bản chiết 10ml không?'];

const NHOM_HUONG_LABEL: Record<string, string> = Object.fromEntries(NHOM_HUONG_OPTIONS.map((o) => [o.value, o.label]));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Ghép dữ liệu hiển thị từ chi tiết sản phẩm ----------
const CONCENTRATIONS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'Extrait', pattern: /extrait(\s+de\s+parfum)?/i },
  { code: 'EDP', pattern: /eau\s+de\s+parfum|\bedp\b/i },
  { code: 'EDT', pattern: /eau\s+de\s+toilette|\bedt\b/i },
  { code: 'EDC', pattern: /eau\s+de\s+cologne|\bedc\b/i },
];

function splitName(d: ProductDetailData): { name: string; code?: string } {
  const hit = CONCENTRATIONS.find((c) => c.pattern.test(d.TenSP) || c.pattern.test(d.DanhMuc?.TenDM ?? ''));
  if (!hit) return { name: d.TenSP };
  const stripped = d.TenSP.replace(hit.pattern, '').replace(/\s{2,}/g, ' ').trim();
  return { name: stripped || d.TenSP, code: hit.code };
}

function scentNotes(d: ProductDetailData): string[] {
  const groups = d.NhomHuong.map((v) => NHOM_HUONG_LABEL[v] ?? v);
  let list = [...groups, ...d.NotHuong.Cuoi, ...d.NotHuong.Giua, ...d.NotHuong.Dau];
  if (list.length === 0) {
    // dữ liệu chưa nhập nhóm hương/tháp hương: lấy tạm từ mô tả "Hương a, b, c"
    list = d.ThongTinChiTiet.replace(/^hương\s+/i, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...new Set(list.map(capitalize))].slice(0, 3);
}

function toAiProduct(d: ProductDetailData, match?: number): AiProduct {
  const { name, code } = splitName(d);
  return {
    _id: d._id,
    TenSP: name,
    NongDo: code,
    AnhChinh: d.HinhAnh[0]?.DuongDan ?? null,
    MoTaHuong: scentNotes(d),
    DoPhuHop: match === undefined ? undefined : Math.max(0, Math.min(100, Math.round(match))),
    BienThe: d.BienThe.map((b) => ({ _id: b._id, TenDungTich: b.TenDungTich, Gia: b.Gia, ConHang: b.ConHang })),
  };
}

interface AiPick {
  _id: string;
  DoPhuHop?: number;
}

/** AI chỉ cần trả _id (+ độ phù hợp); dung tích, giá, ảnh lấy từ dữ liệu sản phẩm thật */
async function buildProducts(picks: AiPick[]): Promise<AiProduct[]> {
  const settled = await Promise.allSettled(picks.map((p) => shopService.getProduct(p._id)));
  const out: AiProduct[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') out.push(toAiProduct(r.value, picks[i].DoPhuHop));
  });
  return out;
}

// ---------- Mock: chưa có AI thật nên trả lời mẫu + 3 sản phẩm bất kỳ ----------
const mockService: AiService = {
  async ask(message) {
    await mockDelay(900);
    const all = await shopService.searchProducts({ gioitinh: [], nhomhuong: [] });
    const start = message.length % Math.max(all.length - 3, 1);
    const picks = all.slice(start, start + 3).map((p, i) => ({ _id: p._id, DoPhuHop: [95, 90, 86][i] }));
    return {
      reply: `Cảm ơn bạn! Dựa trên nhu cầu "${message}", mình gợi ý một vài mùi hương phù hợp bên dưới. (Đây là câu trả lời mẫu, chưa nối AI thật.)`,
      products: await buildProducts(picks),
      suggestions: DEFAULT_SUGGESTIONS,
    };
  },
};

/**
 * API thật — hợp đồng đề xuất để bạn cùng nhóm làm backend AI:
 *   POST /api/ai/chat
 *   body:     { message: string, history: { role: 'user' | 'assistant', content: string }[] }
 *   response: { reply: string, products?: [{ _id, DoPhuHop? }], suggestions?: string[] }
 * Backend chỉ cần trả _id sản phẩm (và độ phù hợp 0–100); frontend tự lấy dung tích, giá, ảnh
 * qua GET /api/products/:id. Khi backend đổi tên trường thì chỉ cần sửa ở file này.
 */
interface ApiAiReply {
  reply: string;
  products?: AiPick[];
  suggestions?: string[];
}

const apiService: AiService = {
  async ask(message, history) {
    const { data } = await api.post<ApiAiReply>('/ai/chat', {
      message,
      history: history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.text })),
    });
    const products = data.products?.length ? await buildProducts(data.products) : [];
    return {
      reply: data.reply,
      products,
      suggestions: data.suggestions ?? (products.length > 0 ? DEFAULT_SUGGESTIONS : []),
    };
  },
};

export const aiService: AiService = USE_MOCK ? mockService : apiService;

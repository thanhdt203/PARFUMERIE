import api, { getAccessToken } from '../lib/api';
import { NHOM_HUONG_OPTIONS } from '../lib/productOptions';
import { shopService } from './shopService';
import type { AiMessage, AiProduct, AiReply } from '../types/ai';
import type { ProductDetailData, ProductVariantView } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export type { AiReply } from '../types/ai';

type HistoryItem = Pick<AiMessage, 'role' | 'text'>;

export interface AiConversationSummary {
  _id: string;
  TieuDe: string;
  updatedAt: string;
}

/** Hội thoại đã lưu trên server (khách hàng đăng nhập) */
export interface AiConversation {
  _id: string;
  messages: { role: 'user' | 'assistant'; text: string; products?: AiProduct[] }[];
}

export interface AiStreamHandlers {
  /** Id hội thoại đã lưu (chỉ khách hàng đăng nhập) */
  onConversation?(id: string): void;
  /** Sản phẩm gợi ý (đã ghép dung tích, giá, ảnh) — đến trước phần chữ */
  onProducts(products: AiProduct[]): void;
  /** Một đoạn chữ của câu trả lời */
  onDelta(text: string): void;
}

export interface AiService {
  /** Gửi câu hỏi kèm lịch sử chat; trả về câu trả lời của AI */
  ask(message: string, history: HistoryItem[]): Promise<AiReply>;
  /** Như ask nhưng trả lời dần qua handlers; reject nếu lỗi, resolve khi AI trả lời xong */
  askStream(
    message: string,
    history: HistoryItem[],
    handlers: AiStreamHandlers,
    signal?: AbortSignal,
    conversationId?: string | null,
  ): Promise<void>;
  /** Lịch sử hội thoại đã lưu của khách hàng đăng nhập */
  listConversations(): Promise<AiConversationSummary[]>;
  getConversation(id: string): Promise<AiConversation>;
  deleteConversation(id: string): Promise<void>;
}

const MAX_HISTORY = 10;

const NHOM_HUONG_LABEL: Record<string, string> = Object.fromEntries(NHOM_HUONG_OPTIONS.map((o) => [o.value, o.label]));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clampPct = (n?: number) => (n === undefined ? undefined : Math.max(0, Math.min(100, Math.round(n))));

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
    DoPhuHop: clampPct(match),
    BienThe: d.BienThe.map((b) => ({ _id: b._id, TenDungTich: b.TenDungTich, Gia: b.Gia, ConHang: b.ConHang })),
  };
}

// ---------- Dạng sản phẩm backend AI trả về ----------
interface ApiAiProduct {
  _id: string;
  TenSP: string;
  GiaThapNhat?: number;
  GiaCaoNhat?: number;
  AnhChinh: string | null;
  ThuongHieu?: { TenTH: string } | null;
  /** Chỉ có ở chế độ chuyên sâu */
  NotHuong?: { Dau: string[]; Giua: string[]; Cuoi: string[] };
  BienThe?: ProductVariantView[];
  /** 0–100, backend chưa trả thì thẻ không hiện "Độ phù hợp" */
  DoPhuHop?: number;
}

/** Dự phòng khi không tải được chi tiết sản phẩm: dùng đúng những gì AI trả về */
function fromApi(sp: ApiAiProduct): AiProduct {
  const n = sp.NotHuong;
  const notes = n ? [...n.Cuoi, ...n.Giua, ...n.Dau] : [];
  return {
    _id: sp._id,
    TenSP: sp.TenSP,
    AnhChinh: sp.AnhChinh,
    MoTaHuong: [...new Set(notes.map(capitalize))].slice(0, 3),
    DoPhuHop: clampPct(sp.DoPhuHop),
    BienThe: (sp.BienThe ?? []).map((b) => ({ _id: b._id, TenDungTich: b.TenDungTich, Gia: b.Gia, ConHang: b.ConHang })),
  };
}

/**
 * AI chỉ cần trả _id; dung tích, giá, ảnh, nồng độ lấy từ GET /api/products/:id
 * (chế độ cơ bản của backend không kèm dung tích nên luôn ghép như vậy cho đồng nhất).
 * `pool` dùng chung để một sản phẩm xuất hiện nhiều lần chỉ tải một lần.
 */
async function enrich(list: ApiAiProduct[], pool = new Map<string, Promise<ProductDetailData>>()): Promise<AiProduct[]> {
  return Promise.all(
    list.map(async (sp) => {
      let job = pool.get(sp._id);
      if (!job) {
        job = shopService.getProduct(sp._id);
        pool.set(sp._id, job);
      }
      try {
        return toAiProduct(await job, sp.DoPhuHop);
      } catch {
        return fromApi(sp);
      }
    }),
  );
}

const toHistory = (history: HistoryItem[]) => history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.text }));

// ---------- Mock: chưa có AI thật nên trả lời mẫu + 3 sản phẩm bất kỳ ----------
const mockService: AiService = {
  async ask(message) {
    await mockDelay(900);
    const all = await shopService.searchProducts({ gioitinh: [], nhomhuong: [] });
    const start = message.length % Math.max(all.length - 3, 1);
    const picks: ApiAiProduct[] = all
      .slice(start, start + 3)
      .map((p, i) => ({ _id: p._id, TenSP: p.TenSP, AnhChinh: p.AnhChinh, DoPhuHop: [95, 90, 86][i] }));
    return {
      reply: `Cảm ơn bạn! Dựa trên nhu cầu "${message}", mình gợi ý một vài mùi hương phù hợp bên dưới. (Đây là câu trả lời mẫu, chưa nối AI thật.)`,
      products: await enrich(picks),
    };
  },
  async listConversations() {
    return [];
  },
  async getConversation(id) {
    return { _id: id, messages: [] };
  },
  async deleteConversation() {},
  async askStream(message, history, handlers, signal) {
    const res = await mockService.ask(message, history);
    if (res.products?.length) handlers.onProducts(res.products);
    for (const word of res.reply.split(/(?<= )/)) {
      if (signal?.aborted) return;
      await mockDelay(40);
      handlers.onDelta(word);
    }
  },
};

/**
 * API thật.
 *   POST /api/ai/chat   body { message, history: [{ role, content }] } -> { reply, products? }
 *   GET|DELETE /api/me/ai/conversations[/:id]   lịch sử đã lưu của khách hàng
 *
 * Streaming (SSE qua POST nên không dùng EventSource):
 *   POST /api/ai/chat/stream, cùng body với /ai/chat (+ conversationId)
 *   event conversation: { id }                   (khách hàng đăng nhập: hội thoại đã lưu, trước done)
 *   event mode:     { mode: 'basic' | 'deep' }   (deep khi gửi kèm token khách hàng)
 *   event products: { products: [...] }   (một lần, trước phần chữ)
 *   event delta:    { text: string }      (nhiều lần)
 *   event done:     {}
 *   event error:    { message: string }
 * Lỗi kiểm tra đầu vào (400) trả JSON thường { message }.
 */
async function readSseStream(res: Response, handlers: AiStreamHandlers): Promise<void> {
  if (!res.body) throw new Error('Trình duyệt không hỗ trợ nhận dữ liệu dạng luồng.');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  // ghép sản phẩm chạy song song với phần chữ; chờ xong trước khi báo "done"
  let productsJob: Promise<void> | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value.replace(/\r\n/g, '\n');
    let end: number;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      const payload = data ? JSON.parse(data) : {};
      if (event === 'conversation') handlers.onConversation?.(String(payload.id));
      else if (event === 'products') {
        productsJob = enrich(payload.products as ApiAiProduct[]).then((products) => handlers.onProducts(products));
      } else if (event === 'delta') handlers.onDelta(String(payload.text ?? ''));
      else if (event === 'error') throw new Error(payload.message || 'Trợ lý AI tạm thời chưa sẵn sàng.');
      else if (event === 'done') {
        await productsJob;
        return;
      }
    }
  }
  throw new Error('Kết nối tới trợ lý AI bị gián đoạn, vui lòng thử lại.');
}

const apiService: AiService = {
  async ask(message, history) {
    const { data } = await api.post<{ reply: string; products?: ApiAiProduct[] }>('/ai/chat', {
      message,
      history: toHistory(history),
    });
    return { reply: data.reply, products: data.products?.length ? await enrich(data.products) : [] };
  },
  async listConversations() {
    const { data } = await api.get<{ data: AiConversationSummary[] }>('/me/ai/conversations');
    return data.data;
  },
  async getConversation(id) {
    const { data } = await api.get<{
      _id: string;
      messages: { role: 'user' | 'assistant'; text: string; products?: ApiAiProduct[] }[];
    }>(`/me/ai/conversations/${id}`);
    const pool = new Map<string, Promise<ProductDetailData>>();
    const messages = [];
    for (const m of data.messages) {
      messages.push({ role: m.role, text: m.text, products: m.products?.length ? await enrich(m.products, pool) : undefined });
    }
    return { _id: data._id, messages };
  },
  async deleteConversation(id) {
    await api.delete(`/me/ai/conversations/${id}`);
  },
  async askStream(message, history, handlers, signal, conversationId) {
    let res: Response;
    try {
      res = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // có token -> backend bật chế độ tư vấn chuyên sâu cho khách hàng
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: JSON.stringify({ message, history: toHistory(history), conversationId: conversationId ?? undefined }),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) return;
      throw new Error('Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa.', { cause: err });
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? 'Có lỗi xảy ra. Thử lại sau.');
    }
    try {
      await readSseStream(res, handlers);
    } catch (err) {
      if (signal?.aborted) return;
      throw err;
    }
  },
};

export const aiService: AiService = USE_MOCK ? mockService : apiService;

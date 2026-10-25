import api from '../lib/api';
import { shopService } from './shopService';
import type { ChatMessage, ProductCardData } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export interface AiReply {
  reply: string;
  /** Sản phẩm AI gợi ý (có thể không có) */
  products?: ProductCardData[];
}

export interface AiStreamHandlers {
  /** Sản phẩm gợi ý — đến trước phần chữ */
  onProducts(products: ProductCardData[]): void;
  /** Một đoạn chữ của câu trả lời */
  onDelta(text: string): void;
}

export interface AiService {
  /** Gửi câu hỏi kèm lịch sử chat; trả về câu trả lời của AI */
  ask(message: string, history: ChatMessage[]): Promise<AiReply>;
  /** Như ask nhưng trả lời dần qua handlers; reject nếu lỗi, resolve khi AI trả lời xong */
  askStream(message: string, history: ChatMessage[], handlers: AiStreamHandlers, signal?: AbortSignal): Promise<void>;
}

// Mock: chưa có AI thật nên trả lời mẫu + vài sản phẩm bất kỳ để xem giao diện
const mockService: AiService = {
  async ask(message) {
    await mockDelay(900);
    const all = await shopService.searchProducts({ gioitinh: [], nhomhuong: [] });
    const start = message.length % Math.max(all.length - 3, 1);
    return {
      reply: `Cảm ơn bạn! Dựa trên nhu cầu "${message}", mình gợi ý một vài mùi hương phù hợp bên dưới. (Đây là câu trả lời mẫu, chưa nối AI thật.)`,
      products: all.slice(start, start + 3),
    };
  },
  async askStream(message, history, handlers, signal) {
    const res = await this.ask(message, history);
    if (res.products) handlers.onProducts(res.products);
    for (const word of res.reply.split(/(?<= )/)) {
      if (signal?.aborted) return;
      await mockDelay(40);
      handlers.onDelta(word);
    }
  },
};

/**
 * API thật — hợp đồng đề xuất để bạn cùng nhóm làm backend AI:
 *   POST /api/ai/chat
 *   body:     { message: string, history: { role: 'user' | 'assistant', content: string }[] }
 *   response: { reply: string, products?: [{ _id, TenSP, ThuongHieu: { TenTH }, GiaThapNhat, GiaCaoNhat, AnhChinh }] }
 * Khi backend đổi tên trường thì chỉ cần sửa ở file này.
 */
interface ApiAiProduct {
  _id: string;
  TenSP: string;
  GiaThapNhat: number;
  GiaCaoNhat: number;
  AnhChinh: string | null;
  ThuongHieu?: { TenTH: string } | null;
}

const toHistory = (history: ChatMessage[]) => history.map((m) => ({ role: m.role, content: m.text }));

const toProductCard = (sp: ApiAiProduct): ProductCardData => ({
  _id: sp._id,
  TenSP: sp.TenSP,
  TenThuongHieu: sp.ThuongHieu?.TenTH ?? '',
  GiaThapNhat: sp.GiaThapNhat,
  GiaCaoNhat: sp.GiaCaoNhat,
  AnhChinh: sp.AnhChinh,
});

/**
 * Streaming (SSE qua POST nên không dùng EventSource):
 *   POST /api/ai/chat/stream, cùng body với /ai/chat
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
      if (event === 'products') handlers.onProducts((payload.products as ApiAiProduct[]).map(toProductCard));
      else if (event === 'delta') handlers.onDelta(String(payload.text ?? ''));
      else if (event === 'error') throw new Error(payload.message || 'Trợ lý AI tạm thời chưa sẵn sàng.');
      else if (event === 'done') return;
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
    return { reply: data.reply, products: data.products?.map(toProductCard) };
  },
  async askStream(message, history, handlers, signal) {
    let res: Response;
    try {
      res = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: toHistory(history) }),
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

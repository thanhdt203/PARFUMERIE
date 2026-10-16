import api from '../lib/api';
import { shopService } from './shopService';
import type { ChatMessage, ProductCardData } from '../types/shop';
import { mockDelay, USE_MOCK } from './config';

export interface AiReply {
  reply: string;
  /** Sản phẩm AI gợi ý (có thể không có) */
  products?: ProductCardData[];
}

export interface AiService {
  /** Gửi câu hỏi kèm lịch sử chat; trả về câu trả lời của AI */
  ask(message: string, history: ChatMessage[]): Promise<AiReply>;
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

const apiService: AiService = {
  async ask(message, history) {
    const { data } = await api.post<{ reply: string; products?: ApiAiProduct[] }>('/ai/chat', {
      message,
      history: history.map((m) => ({ role: m.role, content: m.text })),
    });
    return {
      reply: data.reply,
      products: data.products?.map((sp) => ({
        _id: sp._id,
        TenSP: sp.TenSP,
        TenThuongHieu: sp.ThuongHieu?.TenTH ?? '',
        GiaThapNhat: sp.GiaThapNhat,
        GiaCaoNhat: sp.GiaCaoNhat,
        AnhChinh: sp.AnhChinh,
      })),
    };
  },
};

export const aiService: AiService = USE_MOCK ? mockService : apiService;

import type { Id } from './common';

/** Một dung tích của nước hoa trong thẻ gợi ý */
export interface AiVariant {
  /** MaSPDungTich: dùng cho giỏ hàng */
  _id: Id;
  /** Ví dụ "20ml" */
  TenDungTich: string;
  Gia: number;
  ConHang: boolean;
}

/** Nước hoa AI gợi ý (đã ghép đủ dung tích để thêm giỏ ngay trong khung chat) */
export interface AiProduct {
  _id: Id;
  /** Tên đã bỏ phần nồng độ ở cuối (vd "Dior Sauvage") */
  TenSP: string;
  /** "EDP" | "EDT" | ... nếu nhận ra được */
  NongDo?: string;
  AnhChinh: string | null;
  /** Tối đa 3 mùi chính, vd ["Gỗ", "Vani", "Hổ phách"] */
  MoTaHuong: string[];
  /** 0–100; AI không trả thì không hiện */
  DoPhuHop?: number;
  BienThe: AiVariant[];
}

export interface AiReply {
  reply: string;
  products?: AiProduct[];
  /** Câu hỏi gợi ý bấm nhanh bên dưới câu trả lời */
  suggestions?: string[];
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: AiProduct[];
  suggestions?: string[];
}

export interface AiConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: AiMessage[];
  /** Đã lưu trên server (khách hàng đăng nhập): id là _id của server */
  saved?: boolean;
  /** false = mới có tiêu đề trong danh sách, chưa tải nội dung tin nhắn */
  loaded?: boolean;
}

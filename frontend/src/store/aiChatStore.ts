import { create } from 'zustand';
import { getErrorMessage } from '../lib/errors';
import { aiService } from '../services/aiService';
import type { AiConversation, AiMessage } from '../types/ai';

/** Khách chưa đăng nhập (chế độ dùng thử): chỉ được hỏi chừng này câu mỗi phiên, không lưu lịch sử */
export const GUEST_LIMIT = 5;

const GUEST = 'guest';
const MAX_CONVERSATIONS = 30;
const TITLE_MAX = 40;

const storageKey = (ownerId: string) => `parfumerie-ai-chats:${ownerId}`;

function readStored(ownerId: string): AiConversation[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(ownerId)) ?? '[]');
    return Array.isArray(parsed) ? (parsed as AiConversation[]) : [];
  } catch {
    return [];
  }
}

function writeStored(ownerId: string, list: AiConversation[]): void {
  try {
    localStorage.setItem(storageKey(ownerId), JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
  } catch {
    // bỏ qua: chỉ mất khả năng lưu lịch sử
  }
}

let seq = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;
const makeTitle = (q: string) => (q.length > TITLE_MAX ? `${q.slice(0, TITLE_MAX - 1).trimEnd()}…` : q);

interface AiChatState {
  /** "guest" hoặc _id người dùng; null = chưa gọi hydrate */
  owner: string | null;
  conversations: AiConversation[];
  activeId: string | null;
  sending: boolean;
  /** Số câu khách đã hỏi trong phiên (chỉ dùng cho chế độ dùng thử) */
  guestAsked: number;

  /** Gọi khi biết ai đang dùng: người dùng thì nạp lịch sử đã lưu, khách thì bắt đầu trống */
  hydrate: (ownerId: string | null) => void;
  newChat: () => void;
  select: (id: string) => void;
  remove: (id: string) => void;
  send: (raw: string) => Promise<void>;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  owner: null,
  conversations: [],
  activeId: null,
  sending: false,
  guestAsked: 0,

  hydrate: (ownerId) => {
    const key = ownerId ?? GUEST;
    if (get().owner === key) return; // đã nạp rồi (vd quay lại trang) thì giữ nguyên
    set({
      owner: key,
      conversations: ownerId ? readStored(ownerId) : [],
      activeId: null,
      sending: false,
      guestAsked: 0,
    });
  },

  newChat: () => {
    if (get().sending) return;
    // khách không có lịch sử nên cuộc cũ bỏ luôn
    set(get().owner === GUEST ? { conversations: [], activeId: null } : { activeId: null });
  },

  select: (id) => {
    if (!get().sending) set({ activeId: id });
  },

  remove: (id) => {
    if (get().sending) return;
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    }));
    persist();
  },

  send: async (raw) => {
    const question = raw.trim();
    const s = get();
    if (!question || s.sending || s.owner === null) return;
    const isGuest = s.owner === GUEST;
    if (isGuest && s.guestAsked >= GUEST_LIMIT) return;

    const owner = s.owner;
    const current = s.conversations.find((c) => c.id === s.activeId);
    const history = current?.messages ?? [];
    const convId = current?.id ?? newId('c');
    const userMsg: AiMessage = { id: newId('m'), role: 'user', text: question };

    const next: AiConversation = current
      ? { ...current, messages: [...current.messages, userMsg], updatedAt: Date.now() }
      : { id: convId, title: makeTitle(question), updatedAt: Date.now(), messages: [userMsg] };

    set({
      conversations: [next, ...s.conversations.filter((c) => c.id !== convId)],
      activeId: convId,
      sending: true,
      guestAsked: isGuest ? s.guestAsked + 1 : s.guestAsked,
    });
    persist();

    let reply: AiMessage;
    try {
      const res = await aiService.ask(question, history);
      reply = { id: newId('m'), role: 'assistant', text: res.reply, products: res.products, suggestions: res.suggestions };
    } catch (err) {
      reply = { id: newId('m'), role: 'assistant', text: `Xin lỗi, mình chưa trả lời được lúc này. ${getErrorMessage(err)}` };
    }

    if (get().owner !== owner) return; // trong lúc chờ đã đăng nhập/đăng xuất: bỏ kết quả
    set((state) => ({
      sending: false,
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, reply], updatedAt: Date.now() } : c,
      ),
    }));
    persist();
  },
}));

/** Người dùng đã đăng nhập thì lưu lịch sử vào trình duyệt; khách thì không lưu */
function persist(): void {
  const { owner, conversations } = useAiChatStore.getState();
  if (owner && owner !== GUEST) writeStored(owner, conversations);
}

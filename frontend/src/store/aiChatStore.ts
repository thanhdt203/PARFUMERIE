import { create } from 'zustand';
import { getErrorMessage } from '../lib/errors';
import { aiService } from '../services/aiService';
import type { AiConversationSummary } from '../services/aiService';
import type { AiConversation, AiMessage } from '../types/ai';
import { toast } from './toastStore';

/** Khách chưa đăng nhập (chế độ dùng thử): chỉ được hỏi chừng này câu mỗi phiên, không lưu lịch sử */
export const GUEST_LIMIT = 5;

const GUEST = 'guest';
const TITLE_MAX = 40;
const FOLLOW_UPS = ['Mùi nào lưu hương lâu nhất?', 'So sánh các mùi này', 'Có bản chiết 10ml không?'];

let seq = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;
const makeTitle = (q: string) => (q.length > TITLE_MAX ? `${q.slice(0, TITLE_MAX - 1).trimEnd()}…` : q);

/** Yêu cầu đang chạy, để hủy khi đổi tài khoản */
let controller: AbortController | null = null;

const fromSummary = (s: AiConversationSummary): AiConversation => ({
  id: s._id,
  title: s.TieuDe || 'Cuộc tư vấn',
  updatedAt: Date.parse(s.updatedAt) || Date.now(),
  messages: [],
  saved: true,
  loaded: false,
});

interface AiChatState {
  /** "guest" hoặc _id người dùng; null = chưa gọi hydrate */
  owner: string | null;
  /** true: khách hàng đăng nhập, lịch sử lưu trên server (tài khoản khác thì chỉ lưu tạm trong phiên) */
  serverHistory: boolean;
  conversations: AiConversation[];
  activeId: string | null;
  sending: boolean;
  /** Đang tải danh sách / nội dung hội thoại từ server */
  loadingHistory: boolean;
  /** Số câu khách đã hỏi trong phiên (chỉ dùng cho chế độ dùng thử) */
  guestAsked: number;

  hydrate: (ownerId: string | null, serverHistory: boolean) => void;
  newChat: () => void;
  select: (id: string) => void;
  remove: (id: string) => Promise<void>;
  send: (raw: string) => Promise<void>;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  owner: null,
  serverHistory: false,
  conversations: [],
  activeId: null,
  sending: false,
  loadingHistory: false,
  guestAsked: 0,

  hydrate: (ownerId, serverHistory) => {
    const key = ownerId ?? GUEST;
    if (get().owner === key) return; // đã nạp rồi (vd quay lại trang) thì giữ nguyên
    controller?.abort();
    controller = null;
    set({
      owner: key,
      serverHistory,
      conversations: [],
      activeId: null,
      sending: false,
      loadingHistory: serverHistory,
      guestAsked: 0,
    });
    if (!serverHistory) return;

    aiService
      .listConversations()
      .then((list) => {
        if (get().owner !== key) return;
        set((state) => {
          const have = new Set(state.conversations.map((c) => c.id));
          return {
            loadingHistory: false,
            conversations: [...state.conversations, ...list.filter((i) => !have.has(i._id)).map(fromSummary)],
          };
        });
      })
      .catch(() => {
        if (get().owner === key) set({ loadingHistory: false });
      });
  },

  newChat: () => {
    if (get().sending) return;
    // tài khoản không lưu lịch sử thì cuộc cũ bỏ luôn
    set(get().serverHistory ? { activeId: null } : { conversations: [], activeId: null });
  },

  select: (id) => {
    const s = get();
    if (s.sending) return;
    set({ activeId: id });
    const conv = s.conversations.find((c) => c.id === id);
    if (conv?.saved && !conv.loaded) void loadMessages(id);
  },

  remove: async (id) => {
    const s = get();
    if (s.sending) return;
    const conv = s.conversations.find((c) => c.id === id);
    if (conv?.saved) {
      try {
        await aiService.deleteConversation(id);
      } catch (err) {
        toast.error(getErrorMessage(err));
        return;
      }
    }
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    }));
  },

  send: async (raw) => {
    const question = raw.trim();
    const s = get();
    if (!question || s.sending || s.owner === null) return;
    const isGuest = s.owner === GUEST;
    if (isGuest && s.guestAsked >= GUEST_LIMIT) return;

    const current = s.conversations.find((c) => c.id === s.activeId);
    if (current && current.loaded === false) return; // chưa tải xong nội dung cuộc này

    const owner = s.owner;
    const history = current?.messages ?? [];
    const userMsg: AiMessage = { id: newId('m'), role: 'user', text: question };
    const botMsg: AiMessage = { id: newId('m'), role: 'assistant', text: '' };
    let convId = current?.id ?? newId('c');

    const next: AiConversation = current
      ? { ...current, messages: [...current.messages, userMsg, botMsg], updatedAt: Date.now() }
      : { id: convId, title: makeTitle(question), updatedAt: Date.now(), messages: [userMsg, botMsg], loaded: true };

    set({
      conversations: [next, ...s.conversations.filter((c) => c.id !== convId)],
      activeId: convId,
      sending: true,
      guestAsked: isGuest ? s.guestAsked + 1 : s.guestAsked,
    });

    const alive = () => get().owner === owner;
    const patchBot = (fn: (m: AiMessage) => AiMessage) => {
      if (!alive()) return;
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === convId ? { ...c, messages: c.messages.map((m) => (m.id === botMsg.id ? fn(m) : m)) } : c,
        ),
      }));
    };

    const ctrl = new AbortController();
    controller = ctrl;
    try {
      await aiService.askStream(
        question,
        history,
        {
          // server đã lưu hội thoại mới: đổi id tạm sang id thật để lần hỏi sau nối tiếp đúng cuộc
          onConversation: (serverId) => {
            if (!alive()) return;
            const old = convId;
            convId = serverId;
            set((state) => ({
              conversations: state.conversations.map((c) => (c.id === old ? { ...c, id: serverId, saved: true } : c)),
              activeId: state.activeId === old ? serverId : state.activeId,
            }));
          },
          onProducts: (products) => patchBot((m) => ({ ...m, products })),
          onDelta: (text) => patchBot((m) => ({ ...m, text: m.text + text })),
        },
        ctrl.signal,
        current?.saved ? current.id : null,
      );
      patchBot((m) => (m.products?.length && !m.suggestions ? { ...m, suggestions: FOLLOW_UPS } : m));
    } catch (err) {
      const msg = err instanceof Error ? err.message : getErrorMessage(err);
      patchBot((m) => ({
        ...m,
        text: m.text ? `${m.text}\n\n(${msg})` : `Xin lỗi, mình chưa trả lời được lúc này. ${msg}`,
      }));
    } finally {
      if (alive()) {
        if (controller === ctrl) controller = null;
        set({ sending: false });
      }
    }
  },
}));

/** Tải nội dung tin nhắn của một hội thoại đã lưu trên server */
async function loadMessages(id: string): Promise<void> {
  useAiChatStore.setState({ loadingHistory: true });
  try {
    const conv = await aiService.getConversation(id);
    useAiChatStore.setState((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id
          ? {
              ...c,
              loaded: true,
              messages: conv.messages.map((m) => ({ id: newId('m'), role: m.role, text: m.text, products: m.products })),
            }
          : c,
      ),
    }));
  } catch (err) {
    toast.error(getErrorMessage(err));
  } finally {
    useAiChatStore.setState({ loadingHistory: false });
  }
}

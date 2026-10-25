import { Plus, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { aiService } from '../../services/aiService';
import type { AiConversationSummary } from '../../services/aiService';
import { useToastStore } from '../../store/toastStore';
import type { ChatMessage } from '../../types/shop';
import ProductCard from '../shop/ProductCard';
import AiProductPick from './AiProductPick';
import '../shop/ProductRow.css';
import './AiAdvisor.css';

const SUGGESTIONS = ['Đi làm', 'Hẹn hò', 'Tiệc đêm', 'Mùa hè', 'Quà tặng'];
const PLACEHOLDER = 'VD: nước hoa nam ấm áp đi tiệc mùa đông dưới 2 triệu';

let nextId = 0;
const newId = () => `m${++nextId}`;

/** Khối "Hỏi trợ lý AI": ô nhập + gợi ý nhanh. Gửi câu hỏi thì mở khung chat ngay bên dưới. */
export default function AiAdvisor() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const { role } = useAuth();
  // lịch sử hội thoại đã lưu (chỉ khách hàng đã đăng nhập)
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pushToast = useToastStore((state) => state.push);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await aiService.listConversations());
    } catch {
      setConversations([]); // lịch sử chỉ là tiện ích, lỗi thì bỏ qua
    }
  }, []);

  // đăng nhập -> tải danh sách; đăng xuất -> xóa hội thoại đang mở
  useEffect(() => {
    if (role === 'customer') {
      void refreshConversations();
    } else {
      setConversations([]);
      setConversationId(null);
      setMessages([]);
    }
  }, [role, refreshConversations]);

  const openConversation = async (id: string) => {
    if (sending || !id) return;
    try {
      const conversation = await aiService.getConversation(id);
      setMessages(conversation.messages.map((m) => ({ id: newId(), ...m })));
      setConversationId(conversation._id);
    } catch (err) {
      pushToast('error', err instanceof Error ? getErrorMessage(err) : 'Không mở được cuộc trò chuyện.');
    }
  };

  const startNew = () => {
    if (sending) return;
    setMessages([]);
    setConversationId(null);
  };

  const removeConversation = async () => {
    if (!conversationId || sending) return;
    try {
      await aiService.deleteConversation(conversationId);
      startNew();
      await refreshConversations();
    } catch (err) {
      pushToast('error', getErrorMessage(err));
    }
  };

  // rời trang khi AI đang trả lời -> ngắt kết nối
  useEffect(() => () => abortRef.current?.abort(), []);

  // tin nhắn mới -> cuộn xuống cuối khung chat
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || sending) return;

    const history = messages;
    setMessages([...history, { id: newId(), role: 'user', text: question }]);
    setText('');
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    // tin trả lời được tạo khi có dữ liệu đầu tiên; trước đó hiện chấm "đang gõ"
    const replyId = newId();
    let started = false;
    const patchReply = (patch: (m: ChatMessage) => ChatMessage) => {
      const first = !started; // chốt ngay: updater của setState chạy trễ
      started = true;
      setMessages((prev) =>
        first
          ? [...prev, patch({ id: replyId, role: 'assistant', text: '' })]
          : prev.map((m) => (m.id === replyId ? patch(m) : m))
      );
    };
    try {
      await aiService.askStream(
        question,
        history,
        {
          onConversation: (id) => setConversationId(id),
          onProducts: (products) => products.length > 0 && patchReply((m) => ({ ...m, products })),
          onDelta: (delta) => patchReply((m) => ({ ...m, text: m.text + delta })),
        },
        controller.signal,
        conversationId
      );
      if (role === 'customer') void refreshConversations();
    } catch (err) {
      const reason = err instanceof Error ? err.message : getErrorMessage(err);
      patchReply((m) => ({ ...m, text: `${m.text}${m.text ? '\n\n' : ''}Xin lỗi, mình chưa trả lời được lúc này. ${reason}` }));
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  return (
    <section className="adv" aria-labelledby="adv-title">
      <h2 id="adv-title" className="adv__title">
        Chưa biết chọn mùi hương nào?
        <br />
        Hỏi trợ lý AI của Parfumerie
      </h2>

      <form className="adv__form" onSubmit={onSubmit}>
        <Sparkles className="adv__spark" size={20} strokeWidth={1.8} aria-hidden="true" />
        <input
          className="adv__input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          maxLength={300}
          aria-label="Mô tả mùi hương bạn cần"
        />
        <button type="submit" className="adv__submit" disabled={sending || !text.trim()}>
          Tư vấn ngay
        </button>
      </form>

      <div className="adv__chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="adv__chip" disabled={sending} onClick={() => void send(`Nước hoa ${s.toLowerCase()}`)}>
            {s}
          </button>
        ))}
      </div>

      {messages.length === 0 && conversations.length > 0 && (
        <div className="adv__recent">
          <span>Gần đây:</span>
          {conversations.slice(0, 3).map((c) => (
            <button key={c._id} type="button" className="adv__chip" onClick={() => void openConversation(c._id)}>
              {c.TieuDe}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="adv__chat" role="log" aria-live="polite" aria-label="Cuộc trò chuyện với trợ lý AI">
          <div className="adv__chat-head">
            <span>Trợ lý AI Parfumerie</span>
            <span className="adv__tools">
              {role === 'customer' && conversations.length > 0 && (
                <select
                  className="adv__history"
                  value={conversationId ?? ''}
                  disabled={sending}
                  onChange={(e) => void openConversation(e.target.value)}
                  aria-label="Chọn cuộc trò chuyện đã lưu"
                >
                  {!conversationId && <option value="">Cuộc trò chuyện mới</option>}
                  {conversations.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.TieuDe}
                    </option>
                  ))}
                </select>
              )}
              {role === 'customer' && (
                <button type="button" className="adv__close" onClick={startNew} aria-label="Cuộc trò chuyện mới" disabled={sending}>
                  <Plus size={16} aria-hidden="true" />
                </button>
              )}
              {conversationId && (
                <button type="button" className="adv__close" onClick={() => void removeConversation()} aria-label="Xóa cuộc trò chuyện đã lưu" disabled={sending}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
              <button type="button" className="adv__close" onClick={startNew} aria-label="Đóng cuộc trò chuyện" disabled={sending}>
                <X size={16} aria-hidden="true" />
              </button>
            </span>
          </div>

          {role !== 'customer' && (
            <p className="adv__hint">
              <Link to="/login">Đăng nhập</Link> để nhận tư vấn chuyên sâu: phân tích tầng hương và thêm vào giỏ ngay trong chat.
            </p>
          )}

          <div className="adv__log" ref={logRef}>
            {messages.map((m) => (
              <div key={m.id} className={`adv__msg adv__msg--${m.role}`}>
                {m.text && <p className="adv__bubble">{m.text}</p>}
                {m.products && m.products.length > 0 && (
                  <div className={m.products[0].BienThe ? 'adv__picks' : 'prow__scroll adv__products'}>
                    {m.products.map((p, i) =>
                      p.BienThe ? <AiProductPick key={p._id} product={p} index={i} /> : <ProductCard key={p._id} product={p} index={i} />
                    )}
                  </div>
                )}
              </div>
            ))}
            {sending && !messages[messages.length - 1]?.text && (
              <div className="adv__msg adv__msg--assistant">
                <p className="adv__bubble adv__bubble--typing" aria-label="AI đang trả lời">
                  <span /> <span /> <span />
                </p>
              </div>
            )}
          </div>

          <form className="adv__reply" onSubmit={onSubmit}>
            <input
              className="adv__input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hỏi thêm..."
              maxLength={300}
              aria-label="Hỏi thêm trợ lý AI"
            />
            <button type="submit" className="adv__send" disabled={sending || !text.trim()} aria-label="Gửi">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

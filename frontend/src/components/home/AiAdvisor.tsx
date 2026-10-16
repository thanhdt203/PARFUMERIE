import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import { aiService } from '../../services/aiService';
import type { ChatMessage } from '../../types/shop';
import ProductCard from '../shop/ProductCard';
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
  const logRef = useRef<HTMLDivElement>(null);

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
    try {
      const res = await aiService.ask(question, history);
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text: res.reply, products: res.products }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'assistant', text: `Xin lỗi, mình chưa trả lời được lúc này. ${getErrorMessage(err)}` },
      ]);
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

      {messages.length > 0 && (
        <div className="adv__chat" role="log" aria-live="polite" aria-label="Cuộc trò chuyện với trợ lý AI">
          <div className="adv__chat-head">
            <span>Trợ lý AI Parfumerie</span>
            <button type="button" className="adv__close" onClick={() => setMessages([])} aria-label="Xóa cuộc trò chuyện" disabled={sending}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="adv__log" ref={logRef}>
            {messages.map((m) => (
              <div key={m.id} className={`adv__msg adv__msg--${m.role}`}>
                <p className="adv__bubble">{m.text}</p>
                {m.products && m.products.length > 0 && (
                  <div className="prow__scroll adv__products">
                    {m.products.map((p, i) => (
                      <ProductCard key={p._id} product={p} index={i} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
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

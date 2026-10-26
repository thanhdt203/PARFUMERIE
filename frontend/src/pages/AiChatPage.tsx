import { Menu, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AiProductCard from '../components/ai/AiProductCard';
import SiteLayout from '../components/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { GUEST_LIMIT, useAiChatStore } from '../store/aiChatStore';
import './AiChatPage.css';

const START_SUGGESTIONS = [
  'Nước hoa nam ấm áp đi tiệc mùa đông dưới 2 triệu',
  'Quà tặng bạn gái hương hoa',
  'Mùi tươi mát đi làm',
];

export function AiChatPage() {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations, activeId, sending, loadingHistory, guestAsked, owner, hydrate, newChat, select, remove, send } =
    useAiChatStore();

  const [text, setText] = useState('');
  const [sideOpen, setSideOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const isGuest = !user;
  const ownerId = user?._id ?? null;
  const serverHistory = role === 'customer'; // chỉ khách hàng đăng nhập mới có lịch sử lưu trên server
  const limited = isGuest && guestAsked >= GUEST_LIMIT;

  const active = conversations.find((c) => c.id === activeId);
  const messages = active?.messages ?? [];
  const last = messages[messages.length - 1];
  const openingHistory = Boolean(active?.saved && active.loaded === false);
  const typing = sending && (last?.role === 'user' || (last?.role === 'assistant' && !last.text));

  // nạp lịch sử của đúng người dùng (khách thì bắt đầu trống)
  useEffect(() => {
    if (!loading) hydrate(ownerId, serverHistory);
  }, [loading, ownerId, serverHistory, hydrate]);

  // câu hỏi từ ô "Hỏi trợ lý AI" ở trang chủ: gửi luôn một lần rồi xóa khỏi state của route
  const pending = useRef((location.state as { question?: string } | null)?.question ?? null);
  useEffect(() => {
    if (loading || owner === null) return;
    const question = pending.current;
    if (!question) return;
    pending.current = null;
    navigate('.', { replace: true, state: null });
    void send(question);
  }, [loading, owner, navigate, send]);

  // có tin nhắn mới -> cuộn xuống cuối
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, last?.text.length, sending, activeId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text;
    setText('');
    void send(q);
  };

  const ask = (q: string) => void send(q);

  const startNew = () => {
    newChat();
    setSideOpen(false);
  };

  return (
    <SiteLayout crumb="Tư vấn AI" variant="app">
      <div className={sideOpen ? 'aic is-side-open' : 'aic'}>
        {/* ---------- Cột trái: cuộc mới + lịch sử ---------- */}
        <aside className="aic__side" aria-label="Lịch sử tư vấn">
          <button type="button" className="aic__new" onClick={startNew} disabled={sending}>
            <Plus size={16} aria-hidden="true" /> Cuộc tư vấn mới
          </button>

          <p className="aic__label">LỊCH SỬ TƯ VẤN</p>
          <ul className="aic__history">
            {!serverHistory ? (
              <li className="aic__empty">
                {isGuest ? 'Chế độ dùng thử không lưu lịch sử.' : 'Chỉ tài khoản khách hàng mới lưu lịch sử.'}
              </li>
            ) : conversations.length === 0 ? (
              <li className="aic__empty">{loadingHistory ? 'Đang tải…' : 'Chưa có cuộc tư vấn nào.'}</li>
            ) : (
              conversations.map((c) => (
                <li key={c.id} className={c.id === activeId ? 'aic__item is-active' : 'aic__item'}>
                  <button
                    type="button"
                    className="aic__item-main"
                    title={c.title}
                    disabled={sending}
                    onClick={() => {
                      select(c.id);
                      setSideOpen(false);
                    }}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    className="aic__item-del"
                    aria-label={`Xóa cuộc tư vấn "${c.title}"`}
                    disabled={sending}
                    onClick={() => remove(c.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>

          {isGuest && (
            <div className="aic__trial">
              Chế độ <strong>Dùng thử</strong> (khách chưa đăng nhập): giới hạn lượt hỏi, không lưu lịch sử.{' '}
              <Link to="/login">Đăng nhập</Link> để tư vấn chuyên sâu.
              <span className="aic__trial-left">
                Còn {Math.max(0, GUEST_LIMIT - guestAsked)}/{GUEST_LIMIT} lượt hỏi
              </span>
            </div>
          )}
        </aside>
        <button type="button" className="aic__backdrop" aria-label="Đóng lịch sử" onClick={() => setSideOpen(false)} />

        {/* ---------- Cột phải: khung chat ---------- */}
        <section className="aic__chat" aria-label="Trò chuyện với trợ lý AI">
          <header className="aic__head">
            <button type="button" className="aic__menu" aria-label="Mở lịch sử tư vấn" onClick={() => setSideOpen(true)}>
              <Menu size={20} aria-hidden="true" />
            </button>
            <Sparkles size={18} aria-hidden="true" />
            <h1 className="aic__title">Trợ lý AI Parfumerie</h1>
            <span className="aic__sub">· Tư vấn theo nhóm hương, dịp, thời tiết, ngân sách</span>
          </header>

          <div className="aic__log" ref={logRef} role="log" aria-live="polite">
            <div className="aic__thread">
              {openingHistory ? (
                <p className="aic__empty">Đang tải cuộc trò chuyện…</p>
              ) : messages.length === 0 && !sending ? (
                <div className="aic__welcome">
                  <Sparkles size={28} aria-hidden="true" />
                  <h2>Bạn đang tìm mùi hương nào?</h2>
                  <p>Mô tả phong cách, dịp sử dụng, mùi bạn thích hoặc ngân sách, mình sẽ gợi ý nước hoa phù hợp.</p>
                  <div className="aic__chips">
                    {START_SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className="aic__chip" disabled={limited} onClick={() => ask(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`aic__msg aic__msg--${m.role}`}>
                    {m.text && <p className="aic__bubble">{m.text}</p>}
                    {m.products && m.products.length > 0 && (
                      <div className="aic__products">
                        {m.products.map((p) => (
                          <AiProductCard key={p._id} product={p} />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {typing && (
                <div className="aic__msg aic__msg--assistant">
                  <p className="aic__bubble aic__bubble--typing" aria-label="AI đang trả lời">
                    <span /> <span /> <span />
                  </p>
                </div>
              )}

              {last?.role === 'assistant' && !sending && last.suggestions && last.suggestions.length > 0 && (
                <div className="aic__chips">
                  {last.suggestions.map((s) => (
                    <button key={s} type="button" className="aic__chip" disabled={limited} onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="aic__composer">
            {limited && (
              <p className="aic__limit" role="status">
                Bạn đã dùng hết {GUEST_LIMIT} lượt hỏi dùng thử. <Link to="/login">Đăng nhập</Link> để tiếp tục tư vấn.
              </p>
            )}
            <form className="aic__form" onSubmit={submit}>
              <input
                className="aic__input"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Mô tả phong cách, dịp sử dụng, mùi bạn thích…"
                maxLength={300}
                disabled={limited || openingHistory}
                aria-label="Nhập câu hỏi cho trợ lý AI"
              />
              <button type="submit" className="aic__send" disabled={sending || limited || openingHistory || !text.trim()} aria-label="Gửi">
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

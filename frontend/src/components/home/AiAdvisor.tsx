import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './AiAdvisor.css';

const SUGGESTIONS = ['Đi làm', 'Hẹn hò', 'Tiệc đêm', 'Mùa hè', 'Quà tặng'];
const PLACEHOLDER = 'VD: nước hoa nam ấm áp đi tiệc mùa đông dưới 2 triệu';

/** Khối "Hỏi trợ lý AI": ô nhập + gợi ý nhanh. Gửi câu hỏi thì chuyển sang trang chat /tu-van-ai. */
export default function AiAdvisor() {
  const [text, setText] = useState('');
  const navigate = useNavigate();

  const openChat = (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    navigate('/tu-van-ai', { state: { question } });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    openChat(text);
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
        <button type="submit" className="adv__submit" disabled={!text.trim()}>
          Tư vấn ngay
        </button>
      </form>

      <div className="adv__chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="adv__chip" onClick={() => openChat(`Nước hoa ${s.toLowerCase()}`)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

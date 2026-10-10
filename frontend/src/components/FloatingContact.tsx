// TODO: thay bằng link thật của cửa hàng
const CONTACT = {
  messenger: 'https://m.me/parfumerie',
  zalo: 'https://zalo.me/0900000000',
  phone: 'tel:0900000000',
};

export default function FloatingContact() {
  return (
    <div className="contact">
      <a
        className="contact__btn contact__btn--messenger"
        href={CONTACT.messenger}
        target="_blank"
        rel="noreferrer"
        aria-label="Nhắn tin qua Messenger"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            fill="#fff"
            d="M12 3C7 3 3 6.6 3 11.1c0 2.5 1.3 4.7 3.3 6.2V21l3-1.7c.9.3 1.8.4 2.7.4 5 0 9-3.6 9-8.1S17 3 12 3z"
          />
          <path fill="#0084ff" d="M6.8 13.6l3.4-3.6 2.4 2 3.2-2.9-3.4 3.7-2.4-2z" />
        </svg>
      </a>

      <a
        className="contact__btn contact__btn--zalo"
        href={CONTACT.zalo}
        target="_blank"
        rel="noreferrer"
        aria-label="Nhắn tin qua Zalo"
      >
        Zalo
      </a>

      <a className="contact__btn contact__btn--phone" href={CONTACT.phone} aria-label="Gọi điện">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            fill="#fff"
            d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
          />
        </svg>
      </a>
    </div>
  );
}

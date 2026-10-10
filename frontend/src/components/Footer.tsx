import { Link } from 'react-router-dom';
import './Footer.css';

// Các trang chưa làm sẽ tạm quay về trang chủ (route "*" trong App.tsx)
const COLUMNS = [
  {
    title: 'Về Parfumerie',
    links: [
      { label: 'Trang chủ', to: '/' },
      { label: 'Giới thiệu', to: '/gioi-thieu' },
      { label: 'Sản phẩm', to: '/nuoc-hoa' },
      { label: 'Liên hệ', to: '/lien-he' },
    ],
  },
  {
    title: 'Hướng dẫn',
    links: [
      { label: 'Hướng dẫn mua hàng', to: '/huong-dan-mua-hang' },
      { label: 'Hướng dẫn thanh toán', to: '/huong-dan-thanh-toan' },
      { label: 'Hướng dẫn kiểm hàng', to: '/huong-dan-kiem-hang' },
      { label: 'Điều khoản sử dụng', to: '/dieu-khoan-su-dung' },
    ],
  },
  {
    title: 'Chính sách',
    links: [
      { label: 'Chính sách mua hàng', to: '/chinh-sach-mua-hang' },
      { label: 'Chính sách bảo mật thông tin', to: '/chinh-sach-bao-mat' },
      { label: 'Chính sách giao hàng', to: '/chinh-sach-giao-hang' },
      { label: 'Chính sách đổi trả - bảo hành', to: '/chinh-sach-doi-tra' },
      { label: 'Chính sách bảo mật thanh toán', to: '/chinh-sach-bao-mat-thanh-toan' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Tìm kiếm', to: '/tim-kiem' },
      { label: 'Đăng nhập', to: '/login' },
      { label: 'Đăng ký', to: '/register' },
      { label: 'Cộng tác viên', to: '/cong-tac-vien' },
    ],
  },
];

// TODO: thay bằng ảnh logo thật (đặt trong src/assets) khi có
const PAYMENTS = ['VISA', 'Mastercard', 'JCB', 'napas', 'Tiền mặt', 'Internet Banking', 'VNPAY', 'MoMo'];

// TODO: thay bằng link mạng xã hội thật của cửa hàng
const SOCIAL = {
  facebook: 'https://facebook.com/parfumerie',
  instagram: 'https://instagram.com/parfumerie',
  youtube: 'https://youtube.com/@parfumerie',
  map: 'https://maps.google.com/?q=1F+Quốc+lộ+50,+P.5,+Q.8,+TPHCM',
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__links">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="footer__title">{col.title}</h3>
              <ul className="footer__list">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="footer__link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__info">
          <div>
            <h3 className="footer__title">Phương thức thanh toán</h3>
            <div className="footer__payments">
              {PAYMENTS.map((p) => (
                <span key={p} className="footer__pay">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="footer__title">Kết nối với chúng tôi</h3>
            <div className="footer__social">
              <a className="footer__soc footer__soc--fb" href={SOCIAL.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                f
              </a>
              <a className="footer__soc footer__soc--ig" href={SOCIAL.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="5" />
                  <circle cx="12" cy="12" r="3.6" />
                  <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a className="footer__soc footer__soc--yt" href={SOCIAL.youtube} target="_blank" rel="noreferrer" aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                  <path d="M9 7l8 5-8 5z" />
                </svg>
              </a>
              <a className="footer__soc footer__soc--map" href={SOCIAL.map} target="_blank" rel="noreferrer" aria-label="Bản đồ">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                </svg>
              </a>
            </div>

            {/* TODO: thay bằng huy hiệu thật (DMCA, Bộ Công Thương) */}
            <span className="footer__badge footer__badge--dmca">DMCA PROTECTED</span>
            <span className="footer__badge footer__badge--bct">Đã thông báo Bộ Công Thương</span>
          </div>

          <div>
            <h3 className="footer__title">Thông tin liên hệ</h3>
            <p className="footer__text">Hộ Kinh doanh PARFUMERIE</p>
            <p className="footer__text">Số ĐKKD 41H8185878 cấp ngày 24/3/2022 tại UBND Quận 8, TPHCM</p>
            <p className="footer__text">Địa chỉ: 1F Quốc lộ 50, P.5, Q.8, TPHCM</p>
            <p className="footer__text">Điện thoại: 0888070308</p>
            <p className="footer__text">Email: info@parfumerie.vn</p>
          </div>
        </div>
      </div>

      <div className="footer__copy">Parfumerie.vn © {new Date().getFullYear()}</div>
    </footer>
  );
}

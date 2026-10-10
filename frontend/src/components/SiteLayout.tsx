import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import FloatingContact from './FloatingContact';
import Footer from './Footer';
import './SiteLayout.css';

// Các trang chưa làm sẽ tạm quay về trang chủ (do route "*" trong App.tsx)
const NAV = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Giới thiệu', to: '/gioi-thieu' },
  { label: 'Thương hiệu', to: '/thuong-hieu', dropdown: true },
  { label: 'Nước hoa', to: '/nuoc-hoa', dropdown: true },
  { label: 'Nước hoa chiết', to: '/nuoc-hoa-chiet', dropdown: true },
  { label: 'Kiến thức', to: '/kien-thuc' },
  { label: 'Blog', to: '/blog' },
  { label: 'Liên hệ', to: '/lien-he' },
];

interface SiteLayoutProps {
  crumb: string; // tên trang hiện tại trong breadcrumb
  children: ReactNode;
}

export default function SiteLayout({ crumb, children }: SiteLayoutProps) {
  return (
    <div className="site">
      <div className="site__topbar" />

      <header className="site__header">
        <nav className="site__nav" aria-label="Menu chính">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="site__link">
              {item.label}
              {item.dropdown && (
                <span className="site__caret" aria-hidden="true">
                  ›
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      <div className="site__crumbs">
        <nav className="site__crumbs-inner" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span aria-hidden="true"> › </span>
          <span className="site__crumb-current" aria-current="page">
            {crumb}
          </span>
        </nav>
      </div>

      <main className="site__main">{children}</main>

      <Footer />
      <FloatingContact />
    </div>
  );
}

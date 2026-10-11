import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import FloatingContact from './FloatingContact';
import Footer from './Footer';
import SiteHeaderActions from './SiteHeaderActions';
import { useAsyncData } from '../hooks/useAsyncData';
import { catalogService } from '../services/catalogService';
import './SiteLayout.css';

type MenuKind = 'brands' | 'perfume' | 'decant';

// Các trang chưa làm sẽ tạm quay về trang chủ (do route "*" trong App.tsx)
const NAV: { label: string; to: string; menu?: MenuKind }[] = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Giới thiệu', to: '/gioi-thieu' },
  { label: 'Thương hiệu', to: '/thuong-hieu', menu: 'brands' },
  { label: 'Nước hoa', to: '/nuoc-hoa', menu: 'perfume' },
  { label: 'Nước hoa chiết', to: '/nuoc-hoa-chiet', menu: 'decant' },
  { label: 'Kiến thức', to: '/kien-thuc' },
  { label: 'Blog', to: '/blog' },
  { label: 'Liên hệ', to: '/lien-he' },
];

// load nằm ngoài component để tham chiếu ổn định (useAsyncData yêu cầu)
const loadBrands = () => catalogService.getThuongHieu();
const loadCategories = () => catalogService.getDanhMuc();

const byName = (a: string, b: string) => a.localeCompare(b, 'vi', { sensitivity: 'base' });
// danh mục có chữ "chiết" trong tên thuộc menu "Nước hoa chiết"
const isDecant = (ten: string) => ten.normalize('NFC').toLowerCase().includes('chiết');
// chữ cái đầu (bỏ dấu) để gom nhóm A-Z; không phải chữ cái thì gom vào "#"
const letterOf = (label: string) => {
  const c = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};

interface MenuLink {
  key: string;
  label: string;
  to: string;
}

interface NavDropdownProps {
  label: string;
  to: string;
  links: MenuLink[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** mega: bảng thương hiệu gom theo chữ cái · list: danh sách nhỏ thả xuống */
  variant: 'mega' | 'list';
  /** Chữ hiện khi chưa có mục nào. Bỏ trống thì không hiện bảng */
  emptyText?: string;
}

// Một mục menu: rê chuột (hoặc Tab vào) thì mở bảng liệt kê các link
function NavDropdown({ label, to, links, loading, error, onRetry, variant, emptyText }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
  };
  // trễ 150ms để chuột đi từ chữ xuống bảng không bị đóng giữa chừng
  const hide = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 150);
  };
  const close = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const isMega = variant === 'mega';
  const prefix = isMega ? 'site__mega' : 'site__drop';
  const hasPanel = open && Boolean(error || loading || links.length > 0 || emptyText);
  const showHead = isMega && !error && !loading && links.length > 0;

  // bảng thương hiệu: gom theo chữ cái đầu (links đã được sắp theo tên)
  const groups = useMemo(() => {
    if (!isMega) return [];
    const map = new Map<string, MenuLink[]>();
    for (const l of links) {
      const k = letterOf(l.label);
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return [...map.entries()];
  }, [links, isMega]);

  let body: ReactNode;
  if (error) {
    body = (
      <p className={`${prefix}-msg`} role="alert">
        {error}{' '}
        <button type="button" className="site__mega-retry" onClick={onRetry}>
          Thử lại
        </button>
      </p>
    );
  } else if (loading) {
    body = <p className={`${prefix}-msg`}>Đang tải...</p>;
  } else if (links.length === 0) {
    body = <p className={`${prefix}-msg`}>{emptyText}</p>;
  } else if (isMega) {
    body = (
      <div className="site__mega-cols">
        {groups.map(([letter, items]) => (
          <section key={letter} className="site__mega-group">
            <h3 className="site__mega-letter">{letter}</h3>
            <ul className="site__mega-list">
              {items.map((l) => (
                <li key={l.key}>
                  <Link to={l.to} className="site__mega-link" title={l.label} onClick={close}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  } else {
    body = (
      <ul className="site__drop-list">
        {links.map((l) => (
          <li key={l.key}>
            <Link to={l.to} className="site__drop-link" title={l.label} onClick={close}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={isMega ? 'site__nav-item' : 'site__nav-item site__nav-item--list'}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <Link
        to={to}
        className={hasPanel ? 'site__link is-open' : 'site__link'}
        aria-haspopup="true"
        aria-expanded={hasPanel}
      >
        {label}
        <ChevronDown className="site__caret" size={14} strokeWidth={2.25} aria-hidden="true" />
      </Link>

      {hasPanel &&
        (isMega ? (
          <div className="site__mega" aria-label={label}>
            {showHead && (
              <div className="site__mega-head">
                <span>
                  Tất cả {label.toLowerCase()} · {links.length}
                </span>
                <Link to={to} className="site__mega-all" onClick={close}>
                  Xem tất cả
                  <ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </div>
            )}
            <div className="site__mega-body">{body}</div>
          </div>
        ) : (
          <div className="site__drop" aria-label={label}>
            {body}
          </div>
        ))}
    </div>
  );
}

function SiteNav() {
  const brands = useAsyncData(loadBrands);
  const categories = useAsyncData(loadCategories);

  const brandLinks = useMemo<MenuLink[]>(
    () =>
      (brands.data ?? [])
        .map((b) => ({ key: b._id, label: b.TenTH, to: `/nuoc-hoa?thuonghieu=${b._id}` }))
        .sort((a, b) => byName(a.label, b.label)),
    [brands.data],
  );

  const { perfumeLinks, decantLinks } = useMemo(() => {
    const all = [...(categories.data ?? [])].sort((a, b) => byName(a.TenDM, b.TenDM));
    return {
      perfumeLinks: all
        .filter((d) => !isDecant(d.TenDM))
        .map((d) => ({ key: d._id, label: d.TenDM, to: `/nuoc-hoa?danhmuc=${d._id}` })),
      decantLinks: all
        .filter((d) => isDecant(d.TenDM))
        .map((d) => ({ key: d._id, label: d.TenDM, to: `/nuoc-hoa-chiet?danhmuc=${d._id}` })),
    };
  }, [categories.data]);

  return (
    <nav className="site__nav" aria-label="Menu chính">
      {NAV.map((item) => {
        if (item.menu === 'brands') {
          return (
            <NavDropdown
              key={item.to}
              variant="mega"
              label={item.label}
              to={item.to}
              links={brandLinks}
              loading={brands.loading && !brands.data}
              error={brands.error}
              onRetry={brands.reload}
              emptyText="Chưa có thương hiệu nào."
            />
          );
        }
        if (item.menu === 'perfume' || item.menu === 'decant') {
          return (
            <NavDropdown
              key={item.to}
              variant="list"
              label={item.label}
              to={item.to}
              links={item.menu === 'perfume' ? perfumeLinks : decantLinks}
              loading={categories.loading && !categories.data}
              error={categories.error}
              onRetry={categories.reload}
              emptyText={item.menu === 'perfume' ? 'Chưa có danh mục nào.' : undefined}
            />
          );
        }
        return (
          <Link key={item.to} to={item.to} className="site__link">
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface SiteLayoutProps {
  crumb: string; // tên trang hiện tại trong breadcrumb
  children: ReactNode;
}

export default function SiteLayout({ crumb, children }: SiteLayoutProps) {
  return (
    <div className="site">
      <div className="site__topbar" />

      <header className="site__header">
        <div className="site__header-inner">
          <SiteNav />
          <SiteHeaderActions />
        </div>
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
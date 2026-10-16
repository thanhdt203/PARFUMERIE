import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { formatNumber } from '../../lib/format';
import type { FilterOptions, ProductFilters } from '../../types/shop';
import './FilterSidebar.css';

const GIOI_TINH_LABEL: Record<string, string> = { nam: 'Nam', nu: 'Nữ', unisex: 'Unisex' };
const NHOM_HUONG_LABEL: Record<string, string> = {
  floral: 'Hoa cỏ',
  woody: 'Gỗ',
  oriental: 'Phương Đông',
  fresh: 'Tươi mát',
  citrus: 'Cam chanh',
  fruity: 'Trái cây',
  aromatic: 'Thảo mộc',
  gourmand: 'Ngọt ngào',
  chypre: 'Chypre',
  musk: 'Xạ hương',
};

const PRICE_STEP = 100_000;

interface FilterSidebarProps {
  /** null = đang tải */
  options: FilterOptions | null;
  value: ProductFilters;
  onChange: (next: ProductFilters) => void;
  onReset: () => void;
  /** Có bộ lọc nào đang bật không (để hiện nút Xóa lọc) */
  active: boolean;
}

const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** Thanh lọc bên trái trang chủ: giới tính, nhóm hương, khoảng giá. Điện thoại: thu gọn sau nút "Bộ lọc". */
export default function FilterSidebar({ options, value, onChange, onReset, active }: FilterSidebarProps) {
  const [open, setOpen] = useState(false);

  const maxPrice = options ? Math.ceil(options.KhoangGia.max / PRICE_STEP) * PRICE_STEP : 0;
  const price = value.giaden ?? maxPrice;

  const checkboxes = (group: 'gioitinh' | 'nhomhuong', values: string[], labels: Record<string, string>) =>
    values.map((v) => (
      <label key={v} className="filt__check">
        <input type="checkbox" checked={value[group].includes(v)} onChange={() => onChange({ ...value, [group]: toggle(value[group], v) })} />
        <span>{labels[v] ?? v}</span>
      </label>
    ));

  return (
    <aside className="filt" aria-label="Bộ lọc sản phẩm">
      <button type="button" className="filt__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        Bộ lọc{active ? ' •' : ''}
      </button>

      <div className={open ? 'filt__panel is-open' : 'filt__panel'}>
        <div className="filt__head">
          <h2 className="filt__title">Bộ lọc</h2>
          {active && (
            <button type="button" className="filt__reset" onClick={onReset}>
              Xóa lọc
            </button>
          )}
        </div>

        {!options ? (
          <p className="filt__msg">Đang tải...</p>
        ) : (
          <>
            <fieldset className="filt__group">
              <legend>Giới tính</legend>
              {checkboxes('gioitinh', options.GioiTinh, GIOI_TINH_LABEL)}
            </fieldset>

            <fieldset className="filt__group">
              <legend>Nhóm hương</legend>
              {checkboxes('nhomhuong', options.NhomHuong, NHOM_HUONG_LABEL)}
            </fieldset>

            {maxPrice > 0 && (
              <fieldset className="filt__group">
                <legend>Khoảng giá</legend>
                <input
                  className="filt__range"
                  type="range"
                  min={0}
                  max={maxPrice}
                  step={PRICE_STEP}
                  value={price}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    onChange({ ...value, giaden: n >= maxPrice ? undefined : n });
                  }}
                  aria-label="Giá tối đa"
                />
                <p className="filt__price">0₫ — {formatNumber(price)}₫</p>
              </fieldset>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

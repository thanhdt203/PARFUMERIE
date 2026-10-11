import { createRng } from './random';
import type { SanPhamDungTich } from '../types/catalog';

const NGAY_TAO = '2024-07-01T08:00:00.000Z';

// Giá chai 100ml (VND) và các dung tích bán ra của từng sản phẩm
const BIEN_THE_THEO_SP: ReadonlyArray<{ maSP: string; gia100: number; dungTich: readonly string[] }> = [
  { maSP: 'sp01', gia100: 4350000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp02', gia100: 4100000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp03', gia100: 3600000, dungTich: ['dt10', 'dt30', 'dt50', 'dt100'] },
  { maSP: 'sp04', gia100: 3900000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp05', gia100: 3500000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp06', gia100: 3200000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp07', gia100: 6800000, dungTich: ['dt05', 'dt10', 'dt50', 'dt100'] },
  { maSP: 'sp08', gia100: 7200000, dungTich: ['dt05', 'dt10', 'dt50', 'dt100'] },
  { maSP: 'sp09', gia100: 7900000, dungTich: ['dt05', 'dt10', 'dt50', 'dt100'] },
  { maSP: 'sp10', gia100: 3300000, dungTich: ['dt30', 'dt100'] },
  { maSP: 'sp11', gia100: 2400000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp12', gia100: 2200000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp13', gia100: 4200000, dungTich: ['dt10', 'dt30', 'dt100'] },
  { maSP: 'sp14', gia100: 4200000, dungTich: ['dt10', 'dt30', 'dt100'] },
  { maSP: 'sp15', gia100: 3800000, dungTich: ['dt30', 'dt50', 'dt100'] },
  { maSP: 'sp16', gia100: 4300000, dungTich: ['dt30', 'dt50', 'dt100'] },
];

// Giá theo dung tích so với chai 100ml
const HE_SO_GIA: Record<string, number> = { dt05: 0.09, dt10: 0.17, dt30: 0.42, dt50: 0.68, dt100: 1 };

// Một số biến thể cố ý để tồn thấp để Dashboard và Kho có cảnh báo
const TON_KHO_CO_Y: Record<string, number> = {
  sp01_dt30: 0,
  sp03_dt100: 3,
  sp07_dt50: 2,
  sp09_dt100: 4,
  sp12_dt50: 5,
  sp14_dt30: 1,
};

function taoBienThe(): SanPhamDungTich[] {
  const rng = createRng(20260101);
  const ketQua: SanPhamDungTich[] = [];
  for (const { maSP, gia100, dungTich } of BIEN_THE_THEO_SP) {
    for (const maDungTich of dungTich) {
      const _id = `${maSP}_${maDungTich}`;
      ketQua.push({
        _id,
        MaSP: maSP,
        MaDungTich: maDungTich,
        SoLuongCo: TON_KHO_CO_Y[_id] ?? 8 + Math.floor(rng() * 38),
        Gia: Math.round((gia100 * HE_SO_GIA[maDungTich]) / 10000) * 10000,
        createdAt: NGAY_TAO,
        updatedAt: NGAY_TAO,
      });
    }
  }
  return ketQua;
}

export const SAN_PHAM_DUNG_TICH: SanPhamDungTich[] = taoBienThe();

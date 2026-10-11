import type { DungTich } from '../types/catalog';

const NGAY_TAO = '2024-06-01T08:00:00.000Z';

function dt(_id: string, TenDungTich: string, MoTa: string): DungTich {
  return { _id, TenDungTich, MoTa, createdAt: NGAY_TAO, updatedAt: NGAY_TAO };
}

// 5ml và 10ml là dung tích chiết từ chai gốc (tính năng ở giai đoạn 4)
export const DUNG_TICH: DungTich[] = [
  dt('dt05', '5ml', 'Chiết 5ml'),
  dt('dt10', '10ml', 'Chiết 10ml'),
  dt('dt30', '30ml', 'Chai 30ml'),
  dt('dt50', '50ml', 'Chai 50ml'),
  dt('dt100', '100ml', 'Chai 100ml'),
];

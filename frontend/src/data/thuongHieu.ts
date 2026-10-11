import type { ThuongHieu } from '../types/catalog';

const NGAY_TAO = '2024-06-01T08:00:00.000Z';

function th(_id: string, TenTH: string, MoTa: string): ThuongHieu {
  return { _id, TenTH, MoTa, createdAt: NGAY_TAO, updatedAt: NGAY_TAO };
}

export const THUONG_HIEU: ThuongHieu[] = [
  th('th01', 'Chanel', 'Nhà mốt nước hoa Pháp cao cấp'),
  th('th02', 'Dior', 'Thương hiệu nước hoa Pháp nổi tiếng'),
  th('th03', 'Yves Saint Laurent', 'Nước hoa Pháp phong cách hiện đại, quyến rũ'),
  th('th04', 'Tom Ford', 'Dòng nước hoa Mỹ sang trọng, hương đậm'),
  th('th05', 'Creed', 'Nhà nước hoa lâu đời của Anh và Pháp'),
  th('th06', 'Jo Malone London', 'Nước hoa Anh với hương tươi nhẹ, dễ phối'),
  th('th07', 'Versace', 'Thương hiệu thời trang Ý với dòng nước hoa trẻ trung'),
  th('th08', 'Maison Margiela', 'Dòng Replica gợi lại ký ức và khoảnh khắc'),
];

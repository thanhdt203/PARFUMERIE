import { addDays, startOfDay } from '../lib/dateRange';
import type { KhachHang } from '../types/people';

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const TEN = [
  'Minh Anh', 'Thu Hà', 'Quốc Bảo', 'Hồng Nhung', 'Gia Huy', 'Ngọc Lan', 'Đức Anh', 'Phương Linh',
  'Thanh Tùng', 'Khánh Vy', 'Hải Đăng', 'Bảo Châu', 'Tuấn Kiệt', 'Mai Chi', 'Anh Thư', 'Việt Hoàng',
  'Thùy Dương', 'Hữu Phước', 'Kim Ngân', 'Trọng Nghĩa',
];

export const SO_NGAY_DU_LIEU = 730;
const SO_KHACH = 140;

/** Bỏ dấu tiếng Việt để làm email: "Minh Anh" -> "minhanh" */
function boDau(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function taoKhachHang(): KhachHang[] {
  const homNay = startOfDay(new Date());
  const ketQua: KhachHang[] = [];
  for (let i = 0; i < SO_KHACH; i += 1) {
    const Ho = HO[i % HO.length];
    const Ten = TEN[(i * 7 + Math.floor(i / HO.length)) % TEN.length];
    // khách đăng ký dày dần về gần đây
    const soNgayTruoc = SO_NGAY_DU_LIEU - Math.floor(SO_NGAY_DU_LIEU * Math.pow(i / SO_KHACH, 0.85));
    const ngayTao = addDays(homNay, -soNgayTruoc);
    ngayTao.setHours(9 + (i % 10), (i * 13) % 60, 0, 0);
    const iso = ngayTao.toISOString();
    ketQua.push({
      _id: `kh${String(i + 1).padStart(3, '0')}`,
      Ho,
      Ten,
      Email: `${boDau(Ten)}.${boDau(Ho)}${i + 1}@example.com`,
      SoDienThoai: `09${String(10000000 + i * 37).padStart(8, '0')}`,
      createdAt: iso,
      updatedAt: iso,
    });
  }
  return ketQua;
}

/** Sắp theo ngày đăng ký tăng dần */
export const KHACH_HANG: KhachHang[] = taoKhachHang();

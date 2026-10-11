import { addDays, startOfDay } from '../lib/dateRange';
import type { ChiTietDonHang, DonHang, TrangThaiDonHang } from '../types/sales';
import { KHACH_HANG, SO_NGAY_DU_LIEU } from './khachHang';
import { PHUONG_THUC_THANH_TOAN } from './phuongThucThanhToan';
import { createRng, pick, pickWeighted } from './random';
import { SAN_PHAM } from './sanPham';
import { SAN_PHAM_DUNG_TICH } from './sanPhamDungTich';
import { VOUCHER } from './voucher';

const DIA_CHI = [
  '12 Nguyễn Huệ, Quận 1, TP.HCM',
  '45 Lê Lợi, Quận 1, TP.HCM',
  '230 Điện Biên Phủ, Bình Thạnh, TP.HCM',
  '88 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
  '17 Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
  '5 Phan Chu Trinh, Hải Châu, Đà Nẵng',
  '102 Cách Mạng Tháng 8, Quận 10, TP.HCM',
  '36 Láng Hạ, Đống Đa, Hà Nội',
];
const GHI_CHU = ['Giao giờ hành chính', 'Gọi trước khi giao', 'Gói quà giúp mình', 'Không có ghi chú', 'Giao buổi tối'];
const NHAN_VIEN_XU_LY = ['nv02', 'nv03'];

// sản phẩm càng đứng đầu càng bán chạy
const TRONG_SO_SAN_PHAM = [10, 9, 8, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1];

/** Trạng thái phụ thuộc đơn mới hay cũ */
function chonTrangThai(rng: () => number, soNgayTruoc: number): TrangThaiDonHang {
  if (soNgayTruoc >= 10) return rng() < 0.92 ? 'Hoàn thành' : 'Đã hủy';
  if (soNgayTruoc >= 3) {
    return pickWeighted(rng, ['Hoàn thành', 'Đang giao', 'Đã hủy'] as const, [6, 3, 1]);
  }
  return pickWeighted(rng, ['Chờ xác nhận', 'Đang xử lý', 'Đang giao', 'Hoàn thành'] as const, [4, 3, 2, 1]);
}

function taoDonHang(): { donHang: DonHang[]; chiTiet: ChiTietDonHang[] } {
  const rng = createRng(20260202);
  const homNay = startOfDay(new Date());
  const donHang: DonHang[] = [];
  const chiTiet: ChiTietDonHang[] = [];

  for (let soNgayTruoc = SO_NGAY_DU_LIEU - 1; soNgayTruoc >= 0; soNgayTruoc -= 1) {
    const ngay = addDays(homNay, -soNgayTruoc);
    const tienDo = 1 - soNgayTruoc / SO_NGAY_DU_LIEU; // 0 (xa nhất) -> 1 (hôm nay)
    const cuoiTuan = ngay.getDay() === 0 || ngay.getDay() === 6;
    const soDon = Math.floor(0.8 + 1.4 * tienDo + (cuoiTuan ? 0.5 : 0) + rng() * 1.8);

    for (let k = 0; k < soDon; k += 1) {
      const thoiDiem = new Date(ngay);
      thoiDiem.setHours(8 + Math.floor(rng() * 14), Math.floor(rng() * 60), 0, 0);
      const time = thoiDiem.getTime();

      // chỉ chọn khách đã đăng ký trước thời điểm đặt
      const conDuocChon = KHACH_HANG.filter((kh) => Date.parse(kh.createdAt) <= time);
      const khach = pick(rng, conDuocChon.length > 0 ? conDuocChon : KHACH_HANG.slice(0, 1));

      const maDH = `dh${String(donHang.length + 1).padStart(4, '0')}`;
      const soDong = pickWeighted(rng, [1, 2, 3], [6, 3, 1]);
      const daChon = new Set<string>();
      let tongHang = 0;
      for (let d = 0; d < soDong; d += 1) {
        const sanPham = pickWeighted(rng, SAN_PHAM, TRONG_SO_SAN_PHAM);
        const bienThe = pick(
          rng,
          SAN_PHAM_DUNG_TICH.filter((v) => v.MaSP === sanPham._id),
        );
        if (daChon.has(bienThe._id)) continue; // mỗi biến thể chỉ một dòng trong đơn
        daChon.add(bienThe._id);
        const soLuong = rng() < 0.85 ? 1 : 2;
        tongHang += bienThe.Gia * soLuong;
        chiTiet.push({
          _id: `ct${String(chiTiet.length + 1).padStart(5, '0')}`,
          MaDH: maDH,
          MaSPDungTich: bienThe._id,
          SoLuongMua: soLuong,
          DonGia: bienThe.Gia,
          createdAt: thoiDiem.toISOString(),
          updatedAt: thoiDiem.toISOString(),
        });
      }

      const voucher = rng() < 0.15 ? pick(rng, VOUCHER) : null;
      const trangThai = chonTrangThai(rng, soNgayTruoc);
      const diaChi = pick(rng, DIA_CHI);
      const hoTen = `${khach.Ho} ${khach.Ten}`;

      donHang.push({
        _id: maDH,
        NgayDat: thoiDiem.toISOString(),
        TongTien: Math.max(0, tongHang - (voucher?.GiaTri ?? 0)),
        TrangThai: trangThai,
        MaPTTT: pick(rng, PHUONG_THUC_THANH_TOAN)._id,
        GhiChu: pick(rng, GHI_CHU),
        HoTenKH: hoTen,
        Email: khach.Email,
        SoDienThoai: khach.SoDienThoai,
        DiaChi: diaChi,
        HoTenNguoiNhan: hoTen,
        SoDienThoaiNguoiNhan: khach.SoDienThoai,
        DiaChiNguoiNhan: diaChi,
        MaNV: trangThai === 'Chờ xác nhận' ? null : pick(rng, NHAN_VIEN_XU_LY),
        MaVoucher: voucher?._id ?? null,
        MaKH: khach._id,
        createdAt: thoiDiem.toISOString(),
        updatedAt: thoiDiem.toISOString(),
      });
    }
  }
  return { donHang, chiTiet };
}

const DU_LIEU = taoDonHang();

/** Sắp theo ngày đặt tăng dần */
export const DON_HANG: DonHang[] = DU_LIEU.donHang;
export const CHI_TIET_DON_HANG: ChiTietDonHang[] = DU_LIEU.chiTiet;

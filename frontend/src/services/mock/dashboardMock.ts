import { CAI_DAT_KHO } from '../../data/caiDatKho';
import { CHI_TIET_DON_HANG, DON_HANG } from '../../data/donHang';
import { KHACH_HANG } from '../../data/khachHang';
import { SAN_PHAM } from '../../data/sanPham';
import { SAN_PHAM_DUNG_TICH } from '../../data/sanPhamDungTich';
import { THUONG_HIEU } from '../../data/thuongHieu';
import { buildBuckets, getRangeBounds, isInRange } from '../../lib/dateRange';
import type { DashboardData, DashboardRange, RevenuePoint, TopProduct } from '../../types/dashboard';
import type { DonHang } from '../../types/sales';

const SO_SAN_PHAM_TOP = 5;
const SO_DON_GAN_DAY = 6;

/** Doanh thu và số đơn không tính đơn đã hủy */
function laDonHopLe(don: DonHang): boolean {
  return don.TrangThai !== 'Đã hủy';
}

function tongTien(dons: DonHang[]): number {
  return dons.reduce((sum, don) => sum + don.TongTien, 0);
}

function demKhachMoi(start: Date, end: Date): number {
  return KHACH_HANG.filter((kh) => isInRange(Date.parse(kh.createdAt), start, end)).length;
}

function tinhTopSanPham(donTrongKy: DonHang[]): TopProduct[] {
  const maDonTrongKy = new Set(donTrongKy.map((don) => don._id));
  const bienTheTheoId = new Map(SAN_PHAM_DUNG_TICH.map((v) => [v._id, v]));
  const sanPhamTheoId = new Map(SAN_PHAM.map((p) => [p._id, p]));
  const thuongHieuTheoId = new Map(THUONG_HIEU.map((t) => [t._id, t]));

  const theoSanPham = new Map<string, { soLuong: number; doanhThu: number }>();
  for (const ct of CHI_TIET_DON_HANG) {
    if (!maDonTrongKy.has(ct.MaDH)) continue;
    const bienThe = bienTheTheoId.get(ct.MaSPDungTich);
    if (!bienThe) continue;
    const hienTai = theoSanPham.get(bienThe.MaSP) ?? { soLuong: 0, doanhThu: 0 };
    hienTai.soLuong += ct.SoLuongMua;
    hienTai.doanhThu += ct.SoLuongMua * ct.DonGia;
    theoSanPham.set(bienThe.MaSP, hienTai);
  }

  const ketQua: TopProduct[] = [];
  for (const [maSP, so] of theoSanPham) {
    const sanPham = sanPhamTheoId.get(maSP);
    if (!sanPham) continue;
    ketQua.push({
      maSP,
      tenSP: sanPham.TenSP,
      tenTH: thuongHieuTheoId.get(sanPham.MaTH)?.TenTH ?? '',
      soLuongBan: so.soLuong,
      doanhThu: so.doanhThu,
    });
  }
  return ketQua
    .sort((a, b) => b.soLuongBan - a.soLuongBan || b.doanhThu - a.doanhThu)
    .slice(0, SO_SAN_PHAM_TOP);
}

function tinhSapHetHang(): DashboardData['sapHetHang'] {
  const nguong = CAI_DAT_KHO.nguongSapHet;
  const bienTheThap = SAN_PHAM_DUNG_TICH.filter((v) => v.SoLuongCo <= nguong);
  return {
    soSanPham: new Set(bienTheThap.map((v) => v.MaSP)).size,
    soBienThe: bienTheThap.length,
    nguong,
  };
}

export function getDashboardMock(range: DashboardRange, now: Date = new Date()): DashboardData {
  const bounds = getRangeBounds(range, now);

  const donTrongKy = DON_HANG.filter(
    (don) => laDonHopLe(don) && isInRange(Date.parse(don.NgayDat), bounds.start, bounds.end),
  );
  const donKyTruoc = DON_HANG.filter(
    (don) => laDonHopLe(don) && isInRange(Date.parse(don.NgayDat), bounds.prevStart, bounds.prevEnd),
  );

  const buckets = buildBuckets(bounds);
  const diem: RevenuePoint[] = buckets.map((b) => ({ label: b.label, doanhThu: 0, soDon: 0 }));
  for (const don of donTrongKy) {
    const time = Date.parse(don.NgayDat);
    const index = buckets.findIndex((b) => time >= b.start.getTime() && time < b.end.getTime());
    if (index === -1) continue;
    diem[index].doanhThu += don.TongTien;
    diem[index].soDon += 1;
  }

  // đơn gần đây: lấy tất cả trạng thái, không phụ thuộc bộ lọc
  const donGanDay = DON_HANG.slice(-SO_DON_GAN_DAY)
    .reverse()
    .map(({ _id, HoTenKH, NgayDat, TongTien, TrangThai }) => ({ _id, HoTenKH, NgayDat, TongTien, TrangThai }));

  return {
    range,
    granularity: bounds.granularity,
    doanhThu: { value: tongTien(donTrongKy), previous: tongTien(donKyTruoc) },
    soDon: { value: donTrongKy.length, previous: donKyTruoc.length },
    khachHangMoi: {
      value: demKhachMoi(bounds.start, bounds.end),
      previous: demKhachMoi(bounds.prevStart, bounds.prevEnd),
    },
    tongKhachHang: KHACH_HANG.length,
    sapHetHang: tinhSapHetHang(),
    doanhThuTheoThoiGian: diem,
    donGanDay,
    topSanPham: tinhTopSanPham(donTrongKy),
  };
}

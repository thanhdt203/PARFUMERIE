import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";
import mongoose from "mongoose";

import ThuongHieu from "./models/ThuongHieu.js";
import DanhMucSanPham from "./models/DanhMucSanPham.js";
import DungTich from "./models/DungTich.js";
import PhuongThucThanhToan from "./models/PhuongThucThanhToan.js";
import LoaiTin from "./models/LoaiTin.js";
import NhanVien from "./models/NhanVien.js";
import KhachHang from "./models/KhachHang.js";
import SanPham from "./models/SanPham.js";
import SanPhamDungTich from "./models/SanPhamDungTich.js";
import HinhAnh from "./models/HinhAnh.js";
import Voucher from "./models/Voucher.js";
import GioHang from "./models/GioHang.js";
import DonHang from "./models/DonHang.js";
import ChiTietDonHang from "./models/ChiTietDonHang.js";
import YeuThich from "./models/YeuThich.js";
import SoDiaChi from "./models/SoDiaChi.js";
import TinTuc from "./models/TinTuc.js";
import LienHe from "./models/LienHe.js";

dotenv.config();

const run = async () => {
  await connectDB();

  // Chỉ seed khi DB đang trống - tránh xoá nhầm dữ liệu đã có
  const soLuongSanPham = await SanPham.countDocuments();
  const soLuongKhachHang = await KhachHang.countDocuments();

  if (soLuongSanPham > 0 || soLuongKhachHang > 0) {
    console.log("DB đã có dữ liệu (SanPham hoặc KhachHang khác rỗng) → bỏ qua seed.");
    console.log("Nếu muốn seed lại từ đầu, hãy tự xoá dữ liệu trong Compass/mongosh rồi chạy lại.");
    await mongoose.connection.close();
    process.exit(0);
  }

  // 1. Các bảng không phụ thuộc (danh mục gốc)
  const thuongHieu = await ThuongHieu.create([
    { TenTH: "Chanel", MoTa: "Thương hiệu nước hoa Pháp cao cấp" },
    { TenTH: "Dior", MoTa: "Thương hiệu nước hoa Pháp nổi tiếng" },
  ]);

  const danhMuc = await DanhMucSanPham.create([
    { TenDM: "Nước hoa Nam", MoTa: "Dòng sản phẩm dành cho nam" },
    { TenDM: "Nước hoa Nữ", MoTa: "Dòng sản phẩm dành cho nữ" },
  ]);

  const dungTich = await DungTich.create([
    { TenDungTich: "30ml", MoTa: "Chai 30ml" },
    { TenDungTich: "50ml", MoTa: "Chai 50ml" },
    { TenDungTich: "100ml", MoTa: "Chai 100ml" },
  ]);

  const pttt = await PhuongThucThanhToan.create([
    { TenPTTT: "Thanh toán khi nhận hàng (COD)" },
    { TenPTTT: "Chuyển khoản ngân hàng" },
  ]);

  const loaiTin = await LoaiTin.create([
    { TenLoai: "Khuyến mãi", MoTa: "Tin tức về khuyến mãi" },
  ]);

  const nhanVien = await NhanVien.create([
    { HoTenNV: "Nguyễn Văn A", TenDangNhap: "nva", MatKhau: "123456", SoDienThoai: "0900000001", SoCCCD: "079123456789" },
  ]);

  const khachHang = await KhachHang.create([
    { Ho: "Trần", Ten: "Thị B", Email: "b.tran@example.com", MatKhau: "123456", SoDienThoai: "0900000002" },
  ]);

  // 2. Bảng phụ thuộc cấp 1
  const sanPham = await SanPham.create([
    {
      TenSP: "Chanel No.5",
      MoTa: "Nước hoa nữ kinh điển",
      ThongTinChiTiet: "Hương hoa nhài, hoa hồng, gỗ đàn hương",
      XuatXu: "Pháp",
      MaDM: danhMuc[1]._id,   // Nước hoa Nữ
      MaTH: thuongHieu[0]._id, // Chanel
    },
    {
      TenSP: "Dior Sauvage",
      MoTa: "Nước hoa nam mạnh mẽ",
      ThongTinChiTiet: "Hương cam bergamot, tiêu, hổ phách",
      XuatXu: "Pháp",
      MaDM: danhMuc[0]._id,   // Nước hoa Nam
      MaTH: thuongHieu[1]._id, // Dior
    },
  ]);

  const spDungTich = await SanPhamDungTich.create([
    { MaSP: sanPham[0]._id, MaDungTich: dungTich[1]._id, SoLuongCo: 20, Gia: 2500000 },
    { MaSP: sanPham[1]._id, MaDungTich: dungTich[2]._id, SoLuongCo: 15, Gia: 3200000 },
  ]);

  await HinhAnh.create([
    { DuongDan: "/images/chanel-no5.jpg", LoaiHinhAnh: "Ảnh chính", MaSP: sanPham[0]._id },
    { DuongDan: "/images/dior-sauvage.jpg", LoaiHinhAnh: "Ảnh chính", MaSP: sanPham[1]._id },
  ]);

  const voucher = await Voucher.create([
    { GiaTri: 100000, NgayBatDau: new Date("2026-01-01"), NgayKetThuc: new Date("2026-12-31") },
  ]);

  // 3. Giỏ hàng, đơn hàng
  await GioHang.create([
    { MaKH: khachHang[0]._id, MaSPDungTich: spDungTich[0]._id, SoLuongChonMua: 1 },
  ]);

  const donHang = await DonHang.create([
    {
      NgayDat: new Date(),
      TongTien: 2500000,
      TrangThai: "Chờ xác nhận",
      MaPTTT: pttt[0]._id,
      GhiChu: "Giao giờ hành chính",
      HoTenKH: "Trần Thị B",
      Email: "b.tran@example.com",
      SoDienThoai: "0900000002",
      DiaChi: "123 Nguyễn Trãi, Q1, TP.HCM",
      HoTenNguoiNhan: "Trần Thị B",
      SoDienThoaiNguoiNhan: "0900000002",
      DiaChiNguoiNhan: "123 Nguyễn Trãi, Q1, TP.HCM",
      MaNV: nhanVien[0]._id,
      MaVoucher: voucher[0]._id,
      MaKH: khachHang[0]._id,
    },
  ]);

  await ChiTietDonHang.create([
    { MaDH: donHang[0]._id, MaSPDungTich: spDungTich[0]._id, SoLuongMua: 1, DonGia: 2500000 },
  ]);

  await YeuThich.create([
    { MaKH: khachHang[0]._id, MaSP: sanPham[1]._id },
  ]);

  await SoDiaChi.create([
    { MaKH: khachHang[0]._id, HoTen: "Trần Thị B", Email: "b.tran@example.com", SoDienThoai: "0900000002", DiaChi: "123 Nguyễn Trãi, Q1, TP.HCM" },
  ]);

  await TinTuc.create([
    {
      TieuDe: "Khuyến mãi mùa hè",
      NgayDang: new Date(),
      MoTa: "Giảm giá 20% toàn bộ sản phẩm",
      NoiDung: "Chương trình khuyến mãi áp dụng từ 01/06 đến 30/06.",
      MaNV: nhanVien[0]._id,
      MaLoaiTin: loaiTin[0]._id,
    },
  ]);

  await LienHe.create([
    { HoTen: "Khách vãng lai", Email: "khach@example.com", NoiDung: "Cho tôi hỏi về sản phẩm..." },
  ]);

  console.log("Seed dữ liệu thành công!");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Lỗi khi seed dữ liệu:", err);
  process.exit(1);
});
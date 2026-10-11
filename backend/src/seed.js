import dotenv from "dotenv";
import bcrypt from "bcrypt";
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

// ==DATA-START
const DS_THUONG_HIEU = [
  { TenTH: "Chanel", MoTa: "Thương hiệu nước hoa Pháp cao cấp" },
  { TenTH: "Dior", MoTa: "Thương hiệu nước hoa Pháp nổi tiếng" },
  { TenTH: "Yves Saint Laurent", MoTa: "Thương hiệu thời trang và nước hoa Pháp" },
  { TenTH: "Versace", MoTa: "Thương hiệu thời trang và nước hoa Ý" },
  { TenTH: "Tom Ford", MoTa: "Thương hiệu nước hoa sang trọng của Mỹ" },
];

const DS_DANH_MUC = [
  { TenDM: "Nước hoa Nam", MoTa: "Dòng sản phẩm dành cho nam" },
  { TenDM: "Nước hoa Nữ", MoTa: "Dòng sản phẩm dành cho nữ" },
  { TenDM: "Nước hoa Unisex", MoTa: "Dòng sản phẩm dùng chung nam và nữ" },
];

const DS_DUNG_TICH = [
  { TenDungTich: "30ml", MoTa: "Chai 30ml" },
  { TenDungTich: "50ml", MoTa: "Chai 50ml" },
  { TenDungTich: "100ml", MoTa: "Chai 100ml" },
];

// Mỗi sản phẩm: thương hiệu/danh mục tham chiếu theo TÊN, biến thể = [dung tích, tồn kho, giá]
const DS_SAN_PHAM = [
  {
    TenSP: "Chanel No.5",
    MoTa: "Nước hoa nữ kinh điển, hương hoa cỏ aldehyde sang trọng",
    ThongTinChiTiet: "Biểu tượng của Chanel từ năm 1921, hương hoa nhài, hoa hồng đan xen aldehyde và gỗ đàn hương.",
    XuatXu: "Pháp",
    thuongHieu: "Chanel", danhMuc: "Nước hoa Nữ", GioiTinh: "nu",
    NhomHuong: ["floral", "musk"],
    NotHuong: { Dau: ["aldehyde", "cam bergamot", "ylang ylang"], Giua: ["hoa nhài", "hoa hồng", "hoa diên vĩ"], Cuoi: ["gỗ đàn hương", "vani", "xạ hương"] },
    bienThe: [["50ml", 20, 2500000], ["100ml", 12, 3900000]],
  },
  {
    TenSP: "Bleu de Chanel",
    MoTa: "Nước hoa nam hương gỗ thơm, lịch lãm và tự do",
    ThongTinChiTiet: "Mở đầu tươi mát của họ cam chanh, nền gỗ tuyết tùng và đàn hương ấm áp, phù hợp đi làm và dự tiệc.",
    XuatXu: "Pháp",
    thuongHieu: "Chanel", danhMuc: "Nước hoa Nam", GioiTinh: "nam",
    NhomHuong: ["woody", "aromatic"],
    NotHuong: { Dau: ["bưởi", "chanh", "bạc hà"], Giua: ["gừng", "nhục đậu khấu", "hoa nhài"], Cuoi: ["gỗ tuyết tùng", "gỗ đàn hương", "hương trầm"] },
    bienThe: [["50ml", 15, 3100000], ["100ml", 10, 4300000]],
  },
  {
    TenSP: "Dior Sauvage",
    MoTa: "Nước hoa nam mạnh mẽ, tươi mát và hoang dã",
    ThongTinChiTiet: "Hương cam bergamot, tiêu, hoa oải hương trên nền hổ phách và ambroxan, lưu hương lâu.",
    XuatXu: "Pháp",
    thuongHieu: "Dior", danhMuc: "Nước hoa Nam", GioiTinh: "nam",
    NhomHuong: ["fresh", "aromatic"],
    NotHuong: { Dau: ["cam bergamot", "tiêu"], Giua: ["hoa oải hương", "tiêu tứ xuyên"], Cuoi: ["hổ phách", "ambroxan"] },
    bienThe: [["30ml", 25, 1900000], ["50ml", 18, 2600000], ["100ml", 15, 3200000]],
  },
  {
    TenSP: "Dior J'adore",
    MoTa: "Nước hoa nữ hương hoa trái nữ tính và rạng rỡ",
    ThongTinChiTiet: "Bó hoa nhài, hoa hồng, hoa lan hòa cùng lê và cam bergamot, kết thúc bằng xạ hương và vani.",
    XuatXu: "Pháp",
    thuongHieu: "Dior", danhMuc: "Nước hoa Nữ", GioiTinh: "nu",
    NhomHuong: ["floral", "fruity"],
    NotHuong: { Dau: ["lê", "cam bergamot"], Giua: ["hoa nhài", "hoa hồng", "hoa lan"], Cuoi: ["xạ hương", "gỗ", "vani"] },
    bienThe: [["30ml", 0, 2300000], ["50ml", 14, 3000000], ["100ml", 9, 3900000]],
  },
  {
    TenSP: "YSL Libre",
    MoTa: "Nước hoa nữ phóng khoáng, kết hợp hoa cam và oải hương",
    ThongTinChiTiet: "Oải hương Pháp gặp hoa cam Ma-rốc, nền vani và xạ hương ấm, cá tính và quyến rũ.",
    XuatXu: "Pháp",
    thuongHieu: "Yves Saint Laurent", danhMuc: "Nước hoa Nữ", GioiTinh: "nu",
    NhomHuong: ["floral", "aromatic"],
    NotHuong: { Dau: ["quýt", "oải hương"], Giua: ["hoa cam", "hoa nhài"], Cuoi: ["vani", "xạ hương", "hổ phách"] },
    bienThe: [["30ml", 22, 2200000], ["50ml", 16, 2900000], ["90ml", 0, 3700000]],
  },
  {
    TenSP: "YSL Y Eau de Parfum",
    MoTa: "Nước hoa nam hiện đại, tươi mát pha chút ngọt ấm",
    ThongTinChiTiet: "Táo, gừng và cam bergamot mở đầu, xô thơm giữa hương, kết thúc bằng gỗ tuyết tùng và đậu tonka.",
    XuatXu: "Pháp",
    thuongHieu: "Yves Saint Laurent", danhMuc: "Nước hoa Nam", GioiTinh: "nam",
    NhomHuong: ["aromatic", "woody"],
    NotHuong: { Dau: ["táo", "gừng", "cam bergamot"], Giua: ["xô thơm", "hoa phong lữ"], Cuoi: ["hổ phách", "gỗ tuyết tùng", "đậu tonka"] },
    bienThe: [["60ml", 17, 2800000], ["100ml", 11, 3600000]],
  },
  {
    TenSP: "Versace Eros",
    MoTa: "Nước hoa nam nồng nhiệt, ngọt mát và nam tính",
    ThongTinChiTiet: "Bạc hà, táo xanh và chanh tươi mát, nền vani, đậu tonka và gỗ tuyết tùng, hợp buổi tối.",
    XuatXu: "Ý",
    thuongHieu: "Versace", danhMuc: "Nước hoa Nam", GioiTinh: "nam",
    NhomHuong: ["fresh", "oriental"],
    NotHuong: { Dau: ["bạc hà", "táo xanh", "chanh"], Giua: ["đậu tonka", "hoa phong lữ"], Cuoi: ["vani", "gỗ tuyết tùng", "rêu sồi"] },
    bienThe: [["30ml", 30, 1300000], ["50ml", 24, 1800000], ["100ml", 20, 2400000]],
  },
  {
    TenSP: "Versace Bright Crystal",
    MoTa: "Nước hoa nữ trong trẻo, hương hoa trái tươi sáng",
    ThongTinChiTiet: "Lựu và yuzu mở đầu, mẫu đơn và hoa sen giữa hương, nền xạ hương và hổ phách nhẹ nhàng.",
    XuatXu: "Ý",
    thuongHieu: "Versace", danhMuc: "Nước hoa Nữ", GioiTinh: "nu",
    NhomHuong: ["floral", "fruity"],
    NotHuong: { Dau: ["lựu", "yuzu"], Giua: ["mẫu đơn", "hoa sen"], Cuoi: ["xạ hương", "hổ phách"] },
    bienThe: [["30ml", 26, 1200000], ["50ml", 19, 1700000]],
  },
  {
    TenSP: "Tom Ford Black Orchid",
    MoTa: "Nước hoa unisex bí ẩn, đậm đà và gợi cảm",
    ThongTinChiTiet: "Hoa lan đen, nấm truffle và ylang ylang trên nền patchouli, vani và đàn hương, lưu hương rất lâu.",
    XuatXu: "Mỹ",
    thuongHieu: "Tom Ford", danhMuc: "Nước hoa Unisex", GioiTinh: "unisex",
    NhomHuong: ["oriental", "gourmand"],
    NotHuong: { Dau: ["nấm truffle", "ylang ylang", "cam bergamot"], Giua: ["hoa lan", "hoa sen"], Cuoi: ["patchouli", "vani", "gỗ đàn hương"] },
    bienThe: [["50ml", 8, 4600000], ["100ml", 5, 6200000]],
  },
  {
    // Sản phẩm bị ẩn: dùng để test API public không trả về, admin vẫn thấy
    TenSP: "Tom Ford Oud Wood",
    MoTa: "Nước hoa unisex hương gỗ trầm sang trọng",
    ThongTinChiTiet: "Gỗ trầm, tiêu hồng và đàn hương, kết thúc bằng vani và hổ phách, phong cách phương Đông.",
    XuatXu: "Mỹ",
    thuongHieu: "Tom Ford", danhMuc: "Nước hoa Unisex", GioiTinh: "unisex",
    NhomHuong: ["woody", "oriental"],
    NotHuong: { Dau: ["gỗ trầm", "tiêu hồng"], Giua: ["gỗ đàn hương", "gỗ rosewood"], Cuoi: ["vani", "hổ phách"] },
    DaAn: true,
    bienThe: [["50ml", 6, 5200000]],
  },
  {
    // Sản phẩm hết hàng toàn bộ biến thể: dùng để test "sản phẩm hết hàng"
    TenSP: "Chanel Chance Eau Tendre",
    MoTa: "Nước hoa nữ hương hoa trái nhẹ nhàng, dịu dàng",
    ThongTinChiTiet: "Mộc qua, bưởi mở đầu, hoa nhài và hoa diên vĩ giữa hương, nền xạ hương trắng mềm mại.",
    XuatXu: "Pháp",
    thuongHieu: "Chanel", danhMuc: "Nước hoa Nữ", GioiTinh: "nu",
    NhomHuong: ["floral", "fruity"],
    NotHuong: { Dau: ["mộc qua", "bưởi"], Giua: ["hoa nhài", "hoa diên vĩ"], Cuoi: ["xạ hương trắng", "gỗ tuyết tùng"] },
    bienThe: [["50ml", 0, 2900000], ["100ml", 0, 3800000]],
  },
];
// ==DATA-END

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
  const thuongHieu = await ThuongHieu.create(DS_THUONG_HIEU);
  const danhMuc = await DanhMucSanPham.create(DS_DANH_MUC);
  const dungTich = await DungTich.create(DS_DUNG_TICH);

  const pttt = await PhuongThucThanhToan.create([
    { TenPTTT: "Thanh toán khi nhận hàng (COD)" },
    { TenPTTT: "Chuyển khoản ngân hàng" },
  ]);

  const loaiTin = await LoaiTin.create([
    { TenLoai: "Khuyến mãi", MoTa: "Tin tức về khuyến mãi" },
  ]);

  // Mật khẩu phải hash giống signUp/seedAdmin, nếu không sẽ không đăng nhập được
  const matKhauMau = await bcrypt.hash("123456", 10);

  const nhanVien = await NhanVien.create([
    { HoTenNV: "Nguyễn Văn A", TenDangNhap: "nva", MatKhau: matKhauMau, SoDienThoai: "0900000001", SoCCCD: "079123456789", VaiTro: "staff" },
  ]);

  const khachHang = await KhachHang.create([
    { Ho: "Trần", Ten: "Thị B", Email: "b.tran@example.com", MatKhau: matKhauMau, SoDienThoai: "0900000002" },
  ]);

  // 2. Sản phẩm, biến thể dung tích, hình ảnh
  const thuongHieuTheoTen = Object.fromEntries(thuongHieu.map((t) => [t.TenTH, t]));
  const danhMucTheoTen = Object.fromEntries(danhMuc.map((d) => [d.TenDM, d]));
  const dungTichTheoTen = Object.fromEntries(dungTich.map((d) => [d.TenDungTich, d]));

  const sanPham = [];
  const spDungTich = []; // gom tất cả biến thể để dùng cho giỏ hàng / đơn hàng

  for (const [i, sp] of DS_SAN_PHAM.entries()) {
    // tạo từng sản phẩm một (create 1 doc) để pre('validate') sinh TenKhongDau
    const { thuongHieu: tenTH, danhMuc: tenDM, bienThe, ...thongTin } = sp;
    const spMoi = await SanPham.create({
      ...thongTin,
      MaTH: thuongHieuTheoTen[tenTH]._id,
      MaDM: danhMucTheoTen[tenDM]._id,
    });
    sanPham.push(spMoi);

    // biến thể: tạo tuần tự để hook tự cập nhật GiaThapNhat/GiaCaoNhat
    for (const [tenDT, soLuongCo, gia] of bienThe) {
      let dt = dungTichTheoTen[tenDT];
      if (!dt) {
        // dung tích chưa có trong danh sách gốc (vd 60ml, 90ml) thì tạo thêm
        dt = await DungTich.create({ TenDungTich: tenDT, MoTa: `Chai ${tenDT}` });
        dungTichTheoTen[tenDT] = dt;
      }
      const bt = await SanPhamDungTich.create({
        MaSP: spMoi._id,
        MaDungTich: dt._id,
        SoLuongCo: soLuongCo,
        Gia: gia,
      });
      spDungTich.push(bt);
    }

    const slug = spMoi.TenKhongDau.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await HinhAnh.create([
      { DuongDan: `/images/${slug}.jpg`, LoaiHinhAnh: "Ảnh chính", LaAnhChinh: true, ThuTu: 0, MaSP: spMoi._id },
      { DuongDan: `/images/${slug}-2.jpg`, LoaiHinhAnh: "Ảnh phụ", LaAnhChinh: false, ThuTu: 1, MaSP: spMoi._id },
    ]);
  }

  const voucher = await Voucher.create([
    { GiaTri: 100000, NgayBatDau: new Date("2026-01-01"), NgayKetThuc: new Date("2026-12-31") },
  ]);

  // 3. Giỏ hàng, đơn hàng (dùng biến thể đầu tiên: Chanel No.5 50ml, còn hàng)
  const bienTheMau = spDungTich[0];

  await GioHang.create([
    { MaKH: khachHang[0]._id, MaSPDungTich: bienTheMau._id, SoLuongChonMua: 1 },
  ]);

  const donHang = await DonHang.create([
    {
      NgayDat: new Date(),
      TongTien: bienTheMau.Gia,
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
    { MaDH: donHang[0]._id, MaSPDungTich: bienTheMau._id, SoLuongMua: 1, DonGia: bienTheMau.Gia },
  ]);

  await YeuThich.create([
    { MaKH: khachHang[0]._id, MaSP: sanPham[2]._id }, // Dior Sauvage
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

  console.log(`Seed dữ liệu thành công! (${sanPham.length} sản phẩm, ${spDungTich.length} biến thể)`);
  console.log("Tài khoản mẫu: khách b.tran@example.com / nhân viên nva — mật khẩu 123456");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Lỗi khi seed dữ liệu:", err);
  process.exit(1);
});
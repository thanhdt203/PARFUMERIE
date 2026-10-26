import mongoose from "mongoose";
import { TRANG_THAI_THANH_TOAN } from "../libs/bankTransfer.js";

export const TRANG_THAI_DON_HANG = [
    "Chờ xác nhận",
    "Đang xử lý",
    "Đang giao",
    "Hoàn thành",
    "Đã hủy"
];

const donHangSchema = new mongoose.Schema({
    NgayDat: {
        type: Date,
        required: true,
        default: Date.now
    },
    TongTien: {
        type: Number,
        required: true,
        min: 0
    },
    TrangThai: {
        type: String,
        enum: TRANG_THAI_DON_HANG,
        default: "Chờ xác nhận"
    },
    // trạng thái nhận tiền (khác với TrangThai giao hàng); đơn cũ chưa có trường này coi như chưa thanh toán
    TrangThaiThanhToan: {
        type: String,
        enum: TRANG_THAI_THANH_TOAN,
        default: "Chưa thanh toán"
    },
    NgayThanhToan: {
        type: Date,
        default: null
    },
    MaPTTT: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PhuongThucThanhToan",
        required: true
    },
    GhiChu: {
        type: String,
        default: "",
        maxlength: 150
    },
    HoTenKH: {
        type: String,
        required: true,
        maxlength: 50
    },
    Email: {
        type: String,
        required: true,
        maxlength: 150
    },
    SoDienThoai: {
        type: String,
        required: true,
        maxlength: 15
    },
    DiaChi: {
        type: String,
        required: true,
        maxlength: 150
    },
    HoTenNguoiNhan: {
        type: String,
        required: true,
        maxlength: 100
    },
    SoDienThoaiNguoiNhan: {
        type: String,
        required: true,
        maxlength: 15
    },
    DiaChiNguoiNhan: {
        type: String,
        required: true,
        maxlength: 150
    },
    // đơn khách đặt online chưa có nhân viên nhận nên không bắt buộc
    MaNV: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NhanVien",
        default: null
    },
    // không phải đơn nào cũng dùng voucher
    MaVoucher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Voucher",
        default: null
    },
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true
    }
}, {
    timestamps: true
});

// phục vụ lọc ở trang Đơn hàng và aggregate cho Dashboard
donHangSchema.index({ TrangThai: 1, NgayDat: -1 });
donHangSchema.index({ MaKH: 1, NgayDat: -1 });
donHangSchema.index({ NgayDat: -1 });

const DonHang = mongoose.model("DonHang", donHangSchema);
export default DonHang;
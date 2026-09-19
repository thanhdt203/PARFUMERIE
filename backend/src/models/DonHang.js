import mongoose from "mongoose";

const donHangSchema = new mongoose.Schema({
    NgayDat: {
        type: Date,
        required: true
    },
    TongTien: {
        type: Number,
        required: true
    },
    TrangThai: {
        type: String,
        required: true,
        maxlength: 50
    },
    MaPTTT: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PhuongThucThanhToan",
        required: true
    },
    GhiChu: {
        type: String,
        required: true,
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
    MaNV: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NhanVien",
        required: true
    },
    MaVoucher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Voucher",
        required: true
    },
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true
    }
}, {
    timestamps: true
});

const DonHang = mongoose.model("DonHang", donHangSchema);
export default DonHang;
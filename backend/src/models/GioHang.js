import mongoose from "mongoose";

const gioHangSchema = new mongoose.Schema({
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true
    },
    MaSPDungTich: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPhamDungTich",
        required: true
    },
    SoLuongChonMua: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

// Đảm bảo 1 khách hàng không có 2 dòng trùng cho cùng 1 sản phẩm-dung tích trong giỏ
gioHangSchema.index({ MaKH: 1, MaSPDungTich: 1 }, { unique: true });

const GioHang = mongoose.model("GioHang", gioHangSchema);
export default GioHang;
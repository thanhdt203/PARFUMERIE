import mongoose from "mongoose";

const chiTietDonHangSchema = new mongoose.Schema({
    MaDH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DonHang",
        required: true
    },
    MaSPDungTich: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPhamDungTich",
        required: true
    },
    SoLuongMua: {
        type: Number,
        required: true
    },
    DonGia: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

chiTietDonHangSchema.index({ MaDH: 1, MaSPDungTich: 1 }, { unique: true });

const ChiTietDonHang = mongoose.model("ChiTietDonHang", chiTietDonHangSchema);
export default ChiTietDonHang;
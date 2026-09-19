import mongoose from "mongoose";

const sanPhamDungTichSchema = new mongoose.Schema({
    MaSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham",
        required: true
    },
    MaDungTich: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DungTich",
        required: true
    },
    SoLuongCo: {
        type: Number,
        required: true
    },
    Gia: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const SanPhamDungTich = mongoose.model("SanPhamDungTich", sanPhamDungTichSchema);
export default SanPhamDungTich;
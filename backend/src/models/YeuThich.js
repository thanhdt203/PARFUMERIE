import mongoose from "mongoose";

const yeuThichSchema = new mongoose.Schema({
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true
    },
    MaSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham",
        required: true
    }
}, {
    timestamps: true
});

yeuThichSchema.index({ MaKH: 1, MaSP: 1 }, { unique: true });

const YeuThich = mongoose.model("YeuThich", yeuThichSchema);
export default YeuThich;
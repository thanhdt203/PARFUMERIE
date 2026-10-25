import mongoose from "mongoose";

// Sản phẩm mà khách hàng đã đăng nhập từng xem (phục vụ gợi ý cá nhân hóa của AI)
const luotXemSanPhamSchema = new mongoose.Schema({
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true
    },
    MaSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham",
        required: true
    },
    SoLan: {
        type: Number,
        default: 1,
        min: 1
    },
    LanXemCuoi: {
        type: Date,
        default: Date.now
    }
});

luotXemSanPhamSchema.index({ MaKH: 1, MaSP: 1 }, { unique: true });
luotXemSanPhamSchema.index({ MaKH: 1, LanXemCuoi: -1 });

const LuotXemSanPham = mongoose.model("LuotXemSanPham", luotXemSanPhamSchema);
export default LuotXemSanPham;

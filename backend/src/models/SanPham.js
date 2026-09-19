import mongoose from "mongoose";

const sanPhamSchema = new mongoose.Schema({
    TenSP: {
        type: String,
        required: true,
        maxlength: 100
    },
    MoTa: {
        type: String,
        required: true,
        maxlength: 150
    },
    ThongTinChiTiet: {
        type: String,
        required: true,
        maxlength: 200
    },
    XuatXu: {
        type: String,
        required: true,
        maxlength: 50
    },
    MaDM: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DanhMucSanPham",
        required: true
    },
    MaTH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ThuongHieu",
        required: true
    }
}, {
    timestamps: true
});

const SanPham = mongoose.model("SanPham", sanPhamSchema);
export default SanPham;
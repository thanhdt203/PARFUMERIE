import mongoose from "mongoose";

const danhMucSanPhamSchema = new mongoose.Schema({
    TenDM: {
        type: String,
        required: true,
        maxlength: 50
    },
    MoTa: {
        type: String,
        required: true,
        maxlength: 50
    },
    MaDanhMucCha: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DanhMucSanPham",
        default: null
    }
}, {
    timestamps: true
});

const DanhMucSanPham = mongoose.model("DanhMucSanPham", danhMucSanPhamSchema);
export default DanhMucSanPham;
import mongoose from "mongoose";

const hinhAnhSchema = new mongoose.Schema({
    DuongDan: {
        type: String,
        required: true,
        maxlength: 100
    },
    LoaiHinhAnh: {
        type: String,
        required: true,
        maxlength: 50
    },
    MaSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham",
        required: true
    }
}, {
    timestamps: true
});

const HinhAnh = mongoose.model("HinhAnh", hinhAnhSchema);
export default HinhAnh;
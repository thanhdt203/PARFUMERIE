import mongoose from "mongoose";

const loaiTinSchema = new mongoose.Schema({
    TenLoai: {
        type: String,
        required: true,
        maxlength: 100
    },
    MoTa: {
        type: String,
        required: true,
        maxlength: 150
    }
}, {
    timestamps: true
});

const LoaiTin = mongoose.model("LoaiTin", loaiTinSchema);
export default LoaiTin;
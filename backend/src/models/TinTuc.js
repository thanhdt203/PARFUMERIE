import mongoose from "mongoose";

const tinTucSchema = new mongoose.Schema({
    TieuDe: {
        type: String,
        required: true,
        maxlength: 150
    },
    NgayDang: {
        type: Date,
        required: true
    },
    MoTa: {
        type: String,
        required: true,
        maxlength: 150
    },
    NoiDung: {
        type: String,
        required: true,
        maxlength: 1000
    },
    MaNV: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NhanVien",
        required: true
    },
    MaLoaiTin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LoaiTin",
        required: true
    }
}, {
    timestamps: true
});

const TinTuc = mongoose.model("TinTuc", tinTucSchema);
export default TinTuc;
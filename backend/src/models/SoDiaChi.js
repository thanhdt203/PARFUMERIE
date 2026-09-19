import mongoose from "mongoose";

const soDiaChiSchema = new mongoose.Schema({
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true
    },
    HoTen: {
        type: String,
        required: true,
        maxlength: 100
    },
    Email: {
        type: String,
        required: true,
        maxlength: 100
    },
    SoDienThoai: {
        type: String,
        required: true,
        maxlength: 15
    },
    DiaChi: {
        type: String,
        required: true,
        maxlength: 150
    }
}, {
    timestamps: true
});

const SoDiaChi = mongoose.model("SoDiaChi", soDiaChiSchema);
export default SoDiaChi;
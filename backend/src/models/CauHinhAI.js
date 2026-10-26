import mongoose from "mongoose";

// Cấu hình trợ lý AI do admin quản lý. Chỉ có một bản ghi (Khoa = "main").
const cauHinhAISchema = new mongoose.Schema({
    Khoa: {
        type: String,
        required: true,
        unique: true,
        default: "main"
    },
    // Hướng dẫn riêng của cửa hàng, thêm vào prompt tư vấn (không thay thế các quy tắc gốc)
    HuongDanBoSung: {
        type: String,
        default: "",
        maxlength: 2000
    },
    NguoiCapNhat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NhanVien",
        default: null
    }
}, {
    timestamps: true
});

const CauHinhAI = mongoose.model("CauHinhAI", cauHinhAISchema);
export default CauHinhAI;

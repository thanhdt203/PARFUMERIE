import mongoose from "mongoose";

const tinNhanSchema = new mongoose.Schema({
    VaiTro: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    NoiDung: {
        type: String,
        required: true
    },
    // Sản phẩm AI gợi ý kèm câu trả lời; khi mở lại sẽ tải giá/tồn kho mới nhất
    MaSanPham: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham"
    }]
}, { _id: false, timestamps: { createdAt: true, updatedAt: false } });

const hoiThoaiAISchema = new mongoose.Schema({
    MaKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KhachHang",
        required: true,
        index: true
    },
    TieuDe: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    TinNhan: {
        type: [tinNhanSchema],
        default: []
    }
}, {
    timestamps: true
});

hoiThoaiAISchema.index({ MaKH: 1, updatedAt: -1 });

const HoiThoaiAI = mongoose.model("HoiThoaiAI", hoiThoaiAISchema);
export default HoiThoaiAI;

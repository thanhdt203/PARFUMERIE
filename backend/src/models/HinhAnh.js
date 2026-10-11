import mongoose from "mongoose";

const hinhAnhSchema = new mongoose.Schema({
    DuongDan: {
        type: String,
        required: true,
        maxlength: 500
    },
    LoaiHinhAnh: {
        type: String,
        required: true,
        maxlength: 50
    },
    // ảnh đại diện hiển thị ở danh sách
    LaAnhChinh: {
        type: Boolean,
        default: false
    },
    // thứ tự hiển thị trong trang chi tiết
    ThuTu: {
        type: Number,
        default: 0
    },
    // id trên Cloudinary (nếu dùng) để xóa ảnh khi xóa bản ghi
    PublicId: {
        type: String,
        maxlength: 200
    },
    MaSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham",
        required: true
    }
}, {
    timestamps: true
});

hinhAnhSchema.index({ MaSP: 1, ThuTu: 1 });

const HinhAnh = mongoose.model("HinhAnh", hinhAnhSchema);
export default HinhAnh;
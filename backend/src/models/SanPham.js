import mongoose from "mongoose";

export const GIOI_TINH = ["nam", "nu", "unisex"];
export const NHOM_HUONG = [
    "floral", "woody", "oriental", "fresh", "citrus",
    "fruity", "aromatic", "gourmand", "chypre", "musk"
];

// bỏ dấu tiếng Việt để tìm kiếm không dấu
export const boDau = (str = "") =>
    str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();

const notHuongField = {
    type: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    default: []
};

const sanPhamSchema = new mongoose.Schema({
    TenSP: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    // tự sinh từ TenSP, dùng cho tìm kiếm không dấu
    TenKhongDau: {
        type: String,
        index: true
    },
    MoTa: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    ThongTinChiTiet: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    XuatXu: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    GioiTinh: {
        type: String,
        enum: GIOI_TINH,
        required: true
    },
    NhomHuong: {
        type: [{ type: String, enum: NHOM_HUONG }],
        default: []
    },
    NotHuong: {
        Dau: notHuongField,
        Giua: notHuongField,
        Cuoi: notHuongField
    },
    // khoảng giá tính từ các biến thể dung tích (tự cập nhật, xem SanPhamDungTich.js)
    GiaThapNhat: {
        type: Number,
        default: 0,
        min: 0
    },
    GiaCaoNhat: {
        type: Number,
        default: 0,
        min: 0
    },
    // true = ẩn khỏi phía khách hàng
    DaAn: {
        type: Boolean,
        default: false
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

sanPhamSchema.pre("validate", function () {
    if (this.TenSP) {
        this.TenKhongDau = boDau(this.TenSP);
    }
});

sanPhamSchema.index({ MaTH: 1 });
sanPhamSchema.index({ MaDM: 1 });
sanPhamSchema.index({ GioiTinh: 1 });
sanPhamSchema.index({ NhomHuong: 1 });
sanPhamSchema.index({ DaAn: 1, GiaThapNhat: 1 });

const SanPham = mongoose.model("SanPham", sanPhamSchema);
export default SanPham;
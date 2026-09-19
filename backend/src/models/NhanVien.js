import mongoose from "mongoose";

const nhanVienSchema = new mongoose.Schema({
    HoTenNV: {
        type: String,
        required: true,
        maxlength: 50
    },
    TenDangNhap: {
        type: String,
        required: true,
        maxlength: 50
    },
    MatKhau: {
        type: String,
        required: true,
        unique: true,
        maxlength: 50
    },
    SoDienThoai: {
        type: String,
        required: true,
        unique: true,
        maxlength: 15
    },
    SoCCCD: {
        type: String,
        required: true,
        maxlength: 12
    }
}, {
    timestamps: true
});

const NhanVien = mongoose.model("NhanVien", nhanVienSchema);
export default NhanVien;
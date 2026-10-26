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
        unique: true,
        maxlength: 50
    },
    MatKhau: {
        type: String,
        required: true
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
    },
    VaiTro: {
        type: String,
        enum: ['staff', 'admin'],
        default: 'staff'
    },
    // Email dùng để gửi mật khẩu mới khi admin reset (nhân viên cũ có thể chưa có)
    Email: {
        type: String,
        maxlength: 100,
        unique: true,
        sparse: true,
        trim: true
    },
    NgaySinh: {
        type: Date
    },
    DiaChi: {
        type: String,
        maxlength: 150
    },
    // true = tài khoản bị admin khóa, không đăng nhập được
    BiKhoa: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const NhanVien = mongoose.model("NhanVien", nhanVienSchema);
export default NhanVien;
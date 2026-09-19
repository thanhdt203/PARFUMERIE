import mongoose from "mongoose";

const khachHangSchema = new mongoose.Schema({
    Ho: {
        type: String,
        required: true,
        maxlength: 50
    },
    Ten: {
        type: String,
        required: true,
        maxlength: 50
    },
    Email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 100
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
    }
}, {
    timestamps: true
});

const KhachHang = mongoose.model("KhachHang", khachHangSchema);
export default KhachHang;
import mongoose from "mongoose";

export const LOAI_GIAM = ["tien", "phantram"]; // tien: giảm số tiền cố định, phantram: giảm theo %

const voucherSchema = new mongoose.Schema({
    // Mã khách nhập khi thanh toán. Voucher tạo từ bản cũ chưa có mã nên không bắt buộc ở schema
    // (API admin vẫn bắt buộc khi tạo mới). sparse để nhiều voucher cũ không mã không bị coi là trùng.
    MaCode: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 30,
        unique: true,
        sparse: true
    },
    // Dữ liệu cũ không có trường này -> mặc định "tien" (GiaTri là số tiền VND như trước đây)
    LoaiGiam: {
        type: String,
        enum: LOAI_GIAM,
        default: "tien"
    },
    // LoaiGiam = tien: số tiền giảm (VND); LoaiGiam = phantram: số % giảm (1-100)
    GiaTri: {
        type: Number,
        required: true,
        min: 0
    },
    // Chỉ dùng khi giảm theo %: số tiền giảm tối đa (null = không giới hạn)
    GiamToiDa: {
        type: Number,
        default: null,
        min: 0
    },
    // Tổng tiền hàng tối thiểu để được áp dụng (0 = không yêu cầu)
    DonToiThieu: {
        type: Number,
        default: 0,
        min: 0
    },
    // Tổng số lượt được dùng (null = không giới hạn)
    SoLuong: {
        type: Number,
        default: null,
        min: 1
    },
    // false = admin tạm tắt, khách không dùng được dù còn hạn
    DangBat: {
        type: Boolean,
        default: true
    },
    NgayBatDau: {
        type: Date,
        required: true
    },
    NgayKetThuc: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

const Voucher = mongoose.model("Voucher", voucherSchema);
export default Voucher;

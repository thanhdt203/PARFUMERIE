import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
    GiaTri: {
        type: Number,
        required: true
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
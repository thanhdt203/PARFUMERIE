import mongoose from "mongoose";

const phuongThucThanhToanSchema = new mongoose.Schema({
    TenPTTT: {
        type: String,
        required: true,
        maxlength: 50
    }
}, {
    timestamps: true
});

const PhuongThucThanhToan = mongoose.model("PhuongThucThanhToan", phuongThucThanhToanSchema);
export default PhuongThucThanhToan;
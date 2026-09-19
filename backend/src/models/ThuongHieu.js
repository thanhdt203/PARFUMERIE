import mongoose from "mongoose";

const thuongHieuSchema = new mongoose.Schema({
    TenTH: {
        type: String,
        required: true,
        maxlength: 50
    },
    MoTa: {
        type: String,
        required: true,
        maxlength: 150
    }
}, {
    timestamps: true
});

const ThuongHieu = mongoose.model("ThuongHieu", thuongHieuSchema);
export default ThuongHieu;
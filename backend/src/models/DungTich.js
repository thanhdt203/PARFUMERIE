import mongoose from "mongoose";

const dungTichSchema = new mongoose.Schema({
    TenDungTich: {
        type: String,
        required: true,
        maxlength: 20
    },
    MoTa: {
        type: String,
        required: true,
        maxlength: 50
    }
}, {
    timestamps: true
});

const DungTich = mongoose.model("DungTich", dungTichSchema);
export default DungTich;
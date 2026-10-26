import mongoose from "mongoose";

// Một mục trong cơ sở tri thức của trợ lý AI (ví dụ: khác biệt EDP/EDT, cách bảo quản nước hoa)
const triThucAISchema = new mongoose.Schema({
    TieuDe: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    NoiDung: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    DangBat: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const TriThucAI = mongoose.model("TriThucAI", triThucAISchema);
export default TriThucAI;

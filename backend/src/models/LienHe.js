import mongoose from "mongoose";

const lienHeSchema = new mongoose.Schema({
    HoTen: {
        type: String,
        required: true,
        maxlength: 50
    },
    Email: {
        type: String,
        required: true,
        maxlength: 100
    },
    NoiDung: {
        type: String,
        required: true,
        maxlength: 150
    }
}, {
    timestamps: true
});

const LienHe = mongoose.model("LienHe", lienHeSchema);
export default LienHe;
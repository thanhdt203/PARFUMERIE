import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, 
        index: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    role: {
        type: String,
        enum: ['customer', 'staff', 'admin'],
        required: true
    },
}, {
    timestamps: true,
});

// tự động xóa khi hết hạn
sessionSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

export default mongoose.model('Session', sessionSchema);
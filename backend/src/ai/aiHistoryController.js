import mongoose from "mongoose";
import HoiThoaiAI from "../models/HoiThoaiAI.js";
import { hydrateProducts } from "./aiService.js";


export const MAX_MESSAGES = 100;
const LIST_LIMIT = 20;

export const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

// Lưu một lượt hỏi-đáp vào hội thoại (tạo mới nếu chưa có hoặc không thuộc khách hàng này)
export const saveExchange = async ({ customerId, conversationId, question, answer, productIds }) => {
    const messages = [
        { VaiTro: "user", NoiDung: question },
        { VaiTro: "assistant", NoiDung: answer, MaSanPham: productIds },
    ];
    if (isObjectId(conversationId)) {
        const updated = await HoiThoaiAI.findOneAndUpdate(
            { _id: conversationId, MaKH: customerId, [`TinNhan.${MAX_MESSAGES - 2}`]: { $exists: false } },
            { $push: { TinNhan: { $each: messages } } },
            { new: true, projection: "_id" }
        );
        if (updated) return String(updated._id);
    }
    const created = await HoiThoaiAI.create({ MaKH: customerId, TieuDe: question.slice(0, 80), TinNhan: messages });
    return String(created._id);
};

// GET /api/me/ai/conversations
export const listConversations = async (req, res) => {
    try {
        const items = await HoiThoaiAI.find({ MaKH: req.user._id }, "TieuDe updatedAt")
            .sort({ updatedAt: -1 }).limit(LIST_LIMIT).lean();
        return res.status(200).json({ data: items });
    } catch (error) {
        console.error("Lỗi khi gọi listConversations", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// GET /api/me/ai/conversations/:id
export const getConversation = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });
        const conversation = await HoiThoaiAI.findOne({ _id: req.params.id, MaKH: req.user._id }).lean();
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy hội thoại" });
        const ids = [...new Set(conversation.TinNhan.flatMap((m) => (m.MaSanPham ?? []).map(String)))];
        const products = new Map((await hydrateProducts(ids, "deep")).map((p) => [String(p._id), p]));
        return res.status(200).json({
            _id: conversation._id,
            TieuDe: conversation.TieuDe,
            messages: conversation.TinNhan.map((m) => ({
                role: m.VaiTro,
                text: m.NoiDung,
                products: (m.MaSanPham ?? []).map((id) => products.get(String(id))).filter(Boolean),
            })),
        });
    } catch (error) {
        console.error("Lỗi khi gọi getConversation", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// DELETE /api/me/ai/conversations/:id
export const deleteConversation = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });
        const deleted = await HoiThoaiAI.findOneAndDelete({ _id: req.params.id, MaKH: req.user._id });
        if (!deleted) return res.status(404).json({ message: "Không tìm thấy hội thoại" });
        return res.status(200).json({ message: "Đã xóa hội thoại" });
    } catch (error) {
        console.error("Lỗi khi gọi deleteConversation", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

import CauHinhAI from "../models/CauHinhAI.js";
import HoiThoaiAI from "../models/HoiThoaiAI.js";
import SanPham from "../models/SanPham.js";
import TriThucAI from "../models/TriThucAI.js";
import { aiErrorMessage, parseChatBody } from "./aiController.js";
import { isObjectId } from "./aiHistoryController.js";
import { KNOWLEDGE_CHAR_BUDGET, MAX_KNOWLEDGE_ITEMS, fitKnowledge, loadAiSettings } from "./aiSettings.js";
import { streamAi } from "./aiService.js";


const MAX_INSTRUCTIONS = 2000;
const MAX_TITLE = 120;
const MAX_CONTENT = 1000;
const MAX_ENTRIES = 100;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

const fail = (res, error, label) => {
    console.error(`Lỗi khi gọi ${label}`, error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
};

const readEntry = (body) => {
    const TieuDe = typeof body?.TieuDe === "string" ? body.TieuDe.trim() : "";
    const NoiDung = typeof body?.NoiDung === "string" ? body.NoiDung.trim() : "";
    if (!TieuDe) return { error: "Vui lòng nhập tiêu đề" };
    if (TieuDe.length > MAX_TITLE) return { error: `Tiêu đề tối đa ${MAX_TITLE} ký tự` };
    if (!NoiDung) return { error: "Vui lòng nhập nội dung" };
    if (NoiDung.length > MAX_CONTENT) return { error: `Nội dung tối đa ${MAX_CONTENT} ký tự` };
    return { TieuDe, NoiDung };
};

// ---------- Cấu hình prompt ----------

// GET /api/admin/ai/config
export const getConfig = async (req, res) => {
    try {
        const config = await CauHinhAI.findOne({ Khoa: "main" }).lean();
        return res.status(200).json({
            HuongDanBoSung: config?.HuongDanBoSung ?? "",
            updatedAt: config?.updatedAt ?? null,
            maxLength: MAX_INSTRUCTIONS,
        });
    } catch (error) {
        return fail(res, error, "getConfig");
    }
};

// PUT /api/admin/ai/config   body: { HuongDanBoSung }
export const updateConfig = async (req, res) => {
    try {
        const text = req.body?.HuongDanBoSung;
        if (typeof text !== "string") return res.status(400).json({ message: "Hướng dẫn không hợp lệ" });
        const HuongDanBoSung = text.trim();
        if (HuongDanBoSung.length > MAX_INSTRUCTIONS) {
            return res.status(400).json({ message: `Hướng dẫn tối đa ${MAX_INSTRUCTIONS} ký tự` });
        }
        const config = await CauHinhAI.findOneAndUpdate(
            { Khoa: "main" },
            { $set: { HuongDanBoSung, NguoiCapNhat: req.user._id }, $setOnInsert: { Khoa: "main" } },
            { new: true, upsert: true }
        ).lean();
        return res.status(200).json({ HuongDanBoSung: config.HuongDanBoSung, updatedAt: config.updatedAt });
    } catch (error) {
        return fail(res, error, "updateConfig");
    }
};

// ---------- Cơ sở tri thức ----------

// GET /api/admin/ai/knowledge
export const listKnowledge = async (req, res) => {
    try {
        const entries = await TriThucAI.find().sort({ updatedAt: -1 }).limit(MAX_ENTRIES).lean();
        const active = entries.filter((e) => e.DangBat);
        return res.status(200).json({
            data: entries,
            usage: {
                activeCount: active.length,
                sentCount: fitKnowledge(active).length,
                maxItems: MAX_KNOWLEDGE_ITEMS,
                charBudget: KNOWLEDGE_CHAR_BUDGET,
            },
        });
    } catch (error) {
        return fail(res, error, "listKnowledge");
    }
};

// POST /api/admin/ai/knowledge
export const createKnowledge = async (req, res) => {
    try {
        const { error, TieuDe, NoiDung } = readEntry(req.body);
        if (error) return res.status(400).json({ message: error });
        if ((await TriThucAI.countDocuments()) >= MAX_ENTRIES) {
            return res.status(400).json({ message: `Tối đa ${MAX_ENTRIES} mục tri thức` });
        }
        const DangBat = req.body?.DangBat !== false;
        const entry = await TriThucAI.create({ TieuDe, NoiDung, DangBat });
        return res.status(201).json({ message: "Đã thêm tri thức", data: entry });
    } catch (error) {
        return fail(res, error, "createKnowledge");
    }
};

// PUT /api/admin/ai/knowledge/:id   body: { TieuDe?, NoiDung?, DangBat? }
export const updateKnowledge = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Mã tri thức không hợp lệ" });
        const update = {};
        if (req.body?.TieuDe !== undefined || req.body?.NoiDung !== undefined) {
            const current = await TriThucAI.findById(req.params.id).lean();
            if (!current) return res.status(404).json({ message: "Không tìm thấy tri thức" });
            const { error, TieuDe, NoiDung } = readEntry({ TieuDe: current.TieuDe, NoiDung: current.NoiDung, ...req.body });
            if (error) return res.status(400).json({ message: error });
            Object.assign(update, { TieuDe, NoiDung });
        }
        if (req.body?.DangBat !== undefined) {
            if (typeof req.body.DangBat !== "boolean") return res.status(400).json({ message: "Trạng thái không hợp lệ" });
            update.DangBat = req.body.DangBat;
        }
        const entry = await TriThucAI.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
        if (!entry) return res.status(404).json({ message: "Không tìm thấy tri thức" });
        return res.status(200).json({ message: "Đã cập nhật tri thức", data: entry });
    } catch (error) {
        return fail(res, error, "updateKnowledge");
    }
};

// DELETE /api/admin/ai/knowledge/:id
export const deleteKnowledge = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Mã tri thức không hợp lệ" });
        const deleted = await TriThucAI.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Không tìm thấy tri thức" });
        return res.status(200).json({ message: "Đã xóa tri thức" });
    } catch (error) {
        return fail(res, error, "deleteKnowledge");
    }
};

// ---------- Lịch sử phản hồi ----------

// GET /api/admin/ai/conversations?page=&limit=
export const listAllConversations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
        const [rows, total] = await Promise.all([
            HoiThoaiAI.aggregate([
                { $sort: { updatedAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                { $lookup: { from: "khachhangs", localField: "MaKH", foreignField: "_id", as: "kh" } },
                {
                    $project: {
                        TieuDe: 1, updatedAt: 1, SoTin: { $size: "$TinNhan" },
                        KhachHang: { $let: { vars: { k: { $arrayElemAt: ["$kh", 0] } }, in: { Ho: "$$k.Ho", Ten: "$$k.Ten", Email: "$$k.Email" } } },
                    },
                },
            ]),
            HoiThoaiAI.countDocuments(),
        ]);
        return res.status(200).json({ data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        return fail(res, error, "listAllConversations");
    }
};

// GET /api/admin/ai/conversations/:id
export const getAnyConversation = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });
        const conversation = await HoiThoaiAI.findById(req.params.id).populate("MaKH", "Ho Ten Email").lean();
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy hội thoại" });
        const ids = [...new Set(conversation.TinNhan.flatMap((m) => (m.MaSanPham ?? []).map(String)))];
        const names = new Map((await SanPham.find({ _id: { $in: ids } }, "TenSP").lean()).map((p) => [String(p._id), p.TenSP]));
        return res.status(200).json({
            _id: conversation._id,
            TieuDe: conversation.TieuDe,
            KhachHang: conversation.MaKH ? { Ho: conversation.MaKH.Ho, Ten: conversation.MaKH.Ten, Email: conversation.MaKH.Email } : null,
            messages: conversation.TinNhan.map((m) => ({
                role: m.VaiTro,
                text: m.NoiDung,
                createdAt: m.createdAt,
                products: (m.MaSanPham ?? []).map((id) => names.get(String(id))).filter(Boolean),
            })),
        });
    } catch (error) {
        return fail(res, error, "getAnyConversation");
    }
};

// ---------- Thử nghiệm ----------

// POST /api/admin/ai/test   body: { message, mode?: "basic" | "deep", huongDan? }
// Chạy đúng quy trình tư vấn thật nhưng cho phép thử "hướng dẫn" đang soạn (chưa lưu). Không lưu hội thoại.
export const testAi = async (req, res) => {
    const { error: invalid, message, history } = parseChatBody({ message: req.body?.message });
    if (invalid) return res.status(400).json({ message: invalid });
    const draft = req.body?.huongDan;
    if (draft !== undefined && (typeof draft !== "string" || draft.length > MAX_INSTRUCTIONS)) {
        return res.status(400).json({ message: "Hướng dẫn không hợp lệ" });
    }
    const mode = req.body?.mode === "deep" ? "deep" : "basic";
    try {
        const saved = await loadAiSettings();
        const settings = { ...saved, ...(typeof draft === "string" && { instructions: draft.trim() }) };
        let reply = "";
        let products = [];
        await streamAi({ message, history, mode, settings }, async (event, data) => {
            if (event === "delta") reply += data.text;
            if (event === "products") products = data.products;
        });
        if (!reply) throw new Error("AI_UNAVAILABLE");
        return res.status(200).json({ reply, products, mode });
    } catch (error) {
        console.error("Lỗi khi thử AI:", error.message);
        return res.status(error.message === "AI_TIMEOUT" ? 504 : 503).json({ message: aiErrorMessage(error) });
    }
};


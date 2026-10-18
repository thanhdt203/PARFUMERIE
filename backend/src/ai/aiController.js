import { askAi } from "./aiService.js";


const VALID_ROLES = new Set(["user", "assistant"]);

export const chat = async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message) return res.status(400).json({ message: "Vui lòng nhập nội dung cần tư vấn" });
    if (message.length > 300) return res.status(400).json({ message: "Nội dung tối đa 300 ký tự" });
    if (rawHistory.length > 10) return res.status(400).json({ message: "Lịch sử hội thoại tối đa 10 tin" });
    const history = rawHistory
        .filter((item) => VALID_ROLES.has(item?.role) && typeof item?.content === "string")
        .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 500) }))
        .filter((item) => item.content);
    try {
        return res.status(200).json(await askAi({ message, history }));
    } catch (error) {
        console.error("Lỗi khi gọi AI service:", error.message);
        if (error.message === "AI_TIMEOUT") {
            return res.status(504).json({ message: "Trợ lý AI phản hồi quá lâu, vui lòng thử lại" });
        }
        return res.status(503).json({ message: "Trợ lý AI tạm thời chưa sẵn sàng, vui lòng thử lại sau" });
    }
};


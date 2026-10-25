import { askAi, streamAi } from "./aiService.js";


const VALID_ROLES = new Set(["user", "assistant"]);

const parseChatBody = (body) => {
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    if (!message) return { error: "Vui lòng nhập nội dung cần tư vấn" };
    if (message.length > 300) return { error: "Nội dung tối đa 300 ký tự" };
    if (rawHistory.length > 10) return { error: "Lịch sử hội thoại tối đa 10 tin" };
    const history = rawHistory
        .filter((item) => VALID_ROLES.has(item?.role) && typeof item?.content === "string")
        .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 500) }))
        .filter((item) => item.content);
    return { message, history };
};

const aiErrorMessage = (error) => (error.message === "AI_TIMEOUT"
    ? "Trợ lý AI phản hồi quá lâu, vui lòng thử lại"
    : "Trợ lý AI tạm thời chưa sẵn sàng, vui lòng thử lại sau");

export const chat = async (req, res) => {
    const { error: invalid, message, history } = parseChatBody(req.body);
    if (invalid) return res.status(400).json({ message: invalid });
    try {
        return res.status(200).json(await askAi({ message, history }));
    } catch (error) {
        console.error("Lỗi khi gọi AI service:", error.message);
        return res.status(error.message === "AI_TIMEOUT" ? 504 : 503).json({ message: aiErrorMessage(error) });
    }
};

export const chatStream = async (req, res) => {
    const { error: invalid, message, history } = parseChatBody(req.body);
    if (invalid) return res.status(400).json({ message: invalid });
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    const abort = new AbortController();
    res.on("close", () => abort.abort());
    const send = (event, data) => {
        if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
        await streamAi({ message, history, signal: abort.signal }, send);
    } catch (error) {
        console.error("Lỗi khi gọi AI service (stream):", error.message);
        send("error", { message: aiErrorMessage(error) });
    }
    res.end();
};

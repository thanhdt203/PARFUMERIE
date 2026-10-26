import { saveExchange } from "./aiHistoryController.js";
import { buildProfile } from "./aiProfile.js";
import { askAi, streamAi } from "./aiService.js";


const VALID_ROLES = new Set(["user", "assistant"]);

export const parseChatBody = (body) => {
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

export const aiErrorMessage = (error) => (error.message === "AI_TIMEOUT"
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
    // Khách đã đăng nhập (customer) dùng chế độ chuyên sâu; khách vãng lai dùng chế độ cơ bản
    const mode = req.role === "customer" ? "deep" : "basic";
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    const abort = new AbortController();
    res.on("close", () => abort.abort());
    const write = (event, data) => {
        if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    // Khách hàng đã đăng nhập: gom câu trả lời, lưu vào lịch sử khi AI trả lời xong
    const persist = mode === "deep";
    let answer = "";
    let productIds = [];
    const send = async (event, data) => {
        if (event === "delta") answer += data.text;
        if (event === "products") productIds = data.products.map((p) => p._id);
        if (event === "done" && persist && answer) {
            try {
                const id = await saveExchange({
                    customerId: req.user._id, conversationId: req.body?.conversationId, question: message, answer, productIds,
                });
                write("conversation", { id });
            } catch (error) {
                console.error("Lỗi khi lưu hội thoại AI:", error.message);
            }
        }
        write(event, data);
    };
    write("mode", { mode });
    try {
        const profile = persist ? await buildProfile(req.user._id) : null;
        await streamAi({ message, history, mode, profile, signal: abort.signal }, send);
    } catch (error) {
        console.error("Lỗi khi gọi AI service (stream):", error.message);
        write("error", { message: aiErrorMessage(error) });
    }
    res.end();
};

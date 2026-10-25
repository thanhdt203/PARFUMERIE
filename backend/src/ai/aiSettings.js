import CauHinhAI from "../models/CauHinhAI.js";
import TriThucAI from "../models/TriThucAI.js";


export const MAX_KNOWLEDGE_ITEMS = 30;
// Tổng số ký tự tri thức gửi kèm mỗi câu hỏi; quá ngưỡng thì bỏ các mục cũ hơn
export const KNOWLEDGE_CHAR_BUDGET = 8000;

export const fitKnowledge = (entries) => {
    const knowledge = [];
    let used = 0;
    for (const entry of entries.slice(0, MAX_KNOWLEDGE_ITEMS)) {
        const size = entry.TieuDe.length + entry.NoiDung.length;
        if (used + size > KNOWLEDGE_CHAR_BUDGET) break;
        knowledge.push({ title: entry.TieuDe, content: entry.NoiDung });
        used += size;
    }
    return knowledge;
};

// Cấu hình admin đã lưu. Lỗi thì dùng cấu hình rỗng: AI vẫn tư vấn được theo quy tắc gốc.
export const loadAiSettings = async () => {
    try {
        const [config, entries] = await Promise.all([
            CauHinhAI.findOne({ Khoa: "main" }).lean(),
            TriThucAI.find({ DangBat: true }).sort({ updatedAt: -1 }).lean(),
        ]);
        return { instructions: config?.HuongDanBoSung ?? "", knowledge: fitKnowledge(entries) };
    } catch (error) {
        console.error("Không tải được cấu hình AI:", error.message);
        return { instructions: "", knowledge: [] };
    }
};

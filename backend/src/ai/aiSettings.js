import CauHinhAI from "../models/CauHinhAI.js";
import TriThucAI from "../models/TriThucAI.js";


// Số mục tri thức đang bật gửi sang AI service; ở đó mỗi câu hỏi chỉ lấy các mục liên quan nhất (tra cứu ngữ nghĩa)
export const MAX_KNOWLEDGE_ITEMS = 100;

// Cấu hình admin đã lưu. Lỗi thì dùng cấu hình rỗng: AI vẫn tư vấn được theo quy tắc gốc.
export const loadAiSettings = async () => {
    try {
        const [config, entries] = await Promise.all([
            CauHinhAI.findOne({ Khoa: "main" }).lean(),
            TriThucAI.find({ DangBat: true }).sort({ updatedAt: -1 }).lean(),
        ]);
        return { instructions: config?.HuongDanBoSung ?? "", knowledge: entries.slice(0, MAX_KNOWLEDGE_ITEMS).map((e) => ({ title: e.TieuDe, content: e.NoiDung })) };
    } catch (error) {
        console.error("Không tải được cấu hình AI:", error.message);
        return { instructions: "", knowledge: [] };
    }
};

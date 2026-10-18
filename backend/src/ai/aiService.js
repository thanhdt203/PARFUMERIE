import HinhAnh from "../models/HinhAnh.js";
import SanPham from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";


const buildCatalog = async () => {
    const products = await SanPham.find({ DaAn: false })
        .populate("MaTH", "TenTH")
        .sort({ LuotXem: -1, _id: 1 })
        .limit(100)
        .lean();
    const ids = products.map((product) => product._id);
    const variants = await SanPhamDungTich.find(
        { MaSP: { $in: ids }, SoLuongCo: { $gt: 0 } }, "MaSP Gia"
    ).lean();
    const availableIds = new Set(variants.map((variant) => String(variant.MaSP)));
    return products
        .filter((product) => availableIds.has(String(product._id)))
        .map((product) => ({
            id: String(product._id),
            name: product.TenSP,
            brand: product.MaTH?.TenTH ?? "",
            description: product.MoTa,
            details: product.ThongTinChiTiet,
            gender: product.GioiTinh,
            scent_groups: product.NhomHuong,
            top_notes: product.NotHuong?.Dau ?? [],
            middle_notes: product.NotHuong?.Giua ?? [],
            base_notes: product.NotHuong?.Cuoi ?? [],
            min_price: product.GiaThapNhat,
            max_price: product.GiaCaoNhat,
        }));
};

const hydrateProducts = async (ids) => {
    if (!ids.length) return [];
    const [products, images] = await Promise.all([
        SanPham.find({ _id: { $in: ids }, DaAn: false }).populate("MaTH", "TenTH").lean(),
        HinhAnh.find({ MaSP: { $in: ids } }).sort({ LaAnhChinh: -1, ThuTu: 1 }).lean(),
    ]);
    const imageByProduct = new Map();
    for (const image of images) {
        const id = String(image.MaSP);
        if (!imageByProduct.has(id)) imageByProduct.set(id, image.DuongDan);
    }
    const productById = new Map(products.map((product) => [String(product._id), product]));
    return ids.flatMap((id) => {
        const product = productById.get(id);
        if (!product) return [];
        return [{
            _id: product._id,
            TenSP: product.TenSP,
            GiaThapNhat: product.GiaThapNhat,
            GiaCaoNhat: product.GiaCaoNhat,
            AnhChinh: imageByProduct.get(id) ?? null,
            ThuongHieu: product.MaTH,
        }];
    });
};

export const askAi = async ({ message, history }) => {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 20000);
    const catalog = await buildCatalog();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiTimeoutMs);
    let response;
    try {
        response = await fetch(`${aiServiceUrl}/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, history, products: catalog }),
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === "AbortError") throw new Error("AI_TIMEOUT");
        throw new Error("AI_UNAVAILABLE");
    } finally {
        clearTimeout(timeout);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.detail || "AI_UNAVAILABLE");
        error.status = response.status;
        throw error;
    }
    const productIds = Array.isArray(data.product_ids)
        ? data.product_ids.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)).slice(0, 3)
        : [];
    return {
        reply: typeof data.reply === "string" ? data.reply : "Mình chưa tìm được gợi ý phù hợp.",
        products: await hydrateProducts(productIds),
    };
};


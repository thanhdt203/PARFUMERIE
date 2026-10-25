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
        { MaSP: { $in: ids }, SoLuongCo: { $gt: 0 } }, "MaSP MaDungTich Gia"
    ).populate("MaDungTich", "TenDungTich").sort({ Gia: 1 }).lean();
    const variantsByProduct = new Map();
    for (const variant of variants) {
        const key = String(variant.MaSP);
        if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
        variantsByProduct.get(key).push({ size: variant.MaDungTich?.TenDungTich ?? "", price: variant.Gia });
    }
    return products
        .filter((product) => variantsByProduct.has(String(product._id)))
        .map((product) => {
            const inStock = variantsByProduct.get(String(product._id));
            return {
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
                min_price: inStock[0].price,
                max_price: inStock[inStock.length - 1].price,
                variants: inStock,
            };
        });
};

// Chế độ chuyên sâu: thêm tầng hương và các dung tích còn hàng (kèm _id để thêm vào giỏ)
const loadDeepDetails = async (ids) => {
    const variants = await SanPhamDungTich.find({ MaSP: { $in: ids }, SoLuongCo: { $gt: 0 } })
        .populate("MaDungTich", "TenDungTich").sort({ Gia: 1 }).lean();
    const byProduct = new Map();
    for (const variant of variants) {
        const key = String(variant.MaSP);
        if (!byProduct.has(key)) byProduct.set(key, []);
        byProduct.get(key).push({
            _id: variant._id,
            TenDungTich: variant.MaDungTich?.TenDungTich ?? "",
            Gia: variant.Gia,
            SoLuongCo: variant.SoLuongCo,
            ConHang: true,
        });
    }
    return byProduct;
};

export const hydrateProducts = async (ids, mode = "basic") => {
    if (!ids.length) return [];
    const [products, images, deep] = await Promise.all([
        SanPham.find({ _id: { $in: ids }, DaAn: false }).populate("MaTH", "TenTH").lean(),
        HinhAnh.find({ MaSP: { $in: ids } }).sort({ LaAnhChinh: -1, ThuTu: 1 }).lean(),
        mode === "deep" ? loadDeepDetails(ids) : null,
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
            ...(deep && {
                NotHuong: {
                    Dau: product.NotHuong?.Dau ?? [],
                    Giua: product.NotHuong?.Giua ?? [],
                    Cuoi: product.NotHuong?.Cuoi ?? [],
                },
                BienThe: deep.get(id) ?? [],
            }),
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


const parseSseEvent = (block) => {
    let event = "message";
    const data = [];
    for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    try {
        return { event, data: JSON.parse(data.join("\n") || "{}") };
    } catch {
        return null;
    }
};

// Chuyển tiếp luồng SSE của ai-service; send(event, data) được gọi cho từng sự kiện.
// Timeout tính theo khoảng im lặng giữa hai đoạn dữ liệu, không tính tổng thời gian.
export const streamAi = async ({ message, history, mode = "basic", signal }, send) => {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 20000);
    const catalog = await buildCatalog();
    const controller = new AbortController();
    const onClientAbort = () => controller.abort();
    signal?.addEventListener("abort", onClientAbort);
    let timedOut = false;
    let timer;
    const armTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => { timedOut = true; controller.abort(); }, aiTimeoutMs);
    };
    try {
        armTimer();
        const response = await fetch(`${aiServiceUrl}/recommend/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, history, mode, products: catalog }),
            signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("AI_UNAVAILABLE");
        const decoder = new TextDecoder();
        let buffer = "";
        for await (const chunk of response.body) {
            armTimer();
            buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
            let end;
            while ((end = buffer.indexOf("\n\n")) !== -1) {
                const parsed = parseSseEvent(buffer.slice(0, end));
                buffer = buffer.slice(end + 2);
                if (!parsed) continue;
                if (parsed.event === "products") {
                    const ids = Array.isArray(parsed.data.product_ids)
                        ? parsed.data.product_ids.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)).slice(0, 3)
                        : [];
                    await send("products", { products: await hydrateProducts(ids, mode) });
                } else if (parsed.event === "delta") {
                    await send("delta", { text: String(parsed.data.text ?? "") });
                } else if (parsed.event === "error") {
                    throw new Error(parsed.data.detail || "AI_UNAVAILABLE");
                } else if (parsed.event === "done") {
                    await send("done", {});
                    return;
                }
            }
        }
        throw new Error("AI_UNAVAILABLE");
    } catch (error) {
        if (signal?.aborted) return;
        if (timedOut) throw new Error("AI_TIMEOUT");
        throw error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onClientAbort);
        controller.abort();
    }
};

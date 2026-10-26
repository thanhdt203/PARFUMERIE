import ChiTietDonHang from "../models/ChiTietDonHang.js";
import DonHang from "../models/DonHang.js";
import LuotXemSanPham from "../models/LuotXemSanPham.js";
import SanPham from "../models/SanPham.js";
import YeuThich from "../models/YeuThich.js";


const LIMIT = 10;
const RECENT_ORDERS = 20;

const unique = (ids) => [...new Set(ids.map(String))];

const purchasedProductIds = async (customerId) => {
    const orders = await DonHang.find({ MaKH: customerId, TrangThai: { $ne: "Đã hủy" } }, "_id")
        .sort({ NgayDat: -1 }).limit(RECENT_ORDERS).lean();
    if (!orders.length) return [];
    const lines = await ChiTietDonHang.find({ MaDH: { $in: orders.map((o) => o._id) } }, "MaDH MaSPDungTich")
        .populate("MaSPDungTich", "MaSP").lean();
    const orderRank = new Map(orders.map((o, index) => [String(o._id), index]));
    lines.sort((a, b) => orderRank.get(String(a.MaDH)) - orderRank.get(String(b.MaDH)));
    return unique(lines.map((l) => l.MaSPDungTich?.MaSP).filter(Boolean)).slice(0, LIMIT);
};

const toProfileProduct = (product) => ({
    id: String(product._id),
    name: product.TenSP,
    brand: product.MaTH?.TenTH ?? "",
    gender: product.GioiTinh,
    scent_groups: product.NhomHuong ?? [],
    notes: [...(product.NotHuong?.Dau ?? []), ...(product.NotHuong?.Giua ?? []), ...(product.NotHuong?.Cuoi ?? [])],
});

// Gu của khách hàng từ chai đã mua, đã thích và đã xem gần đây. Lỗi thì trả null: AI vẫn tư vấn được, chỉ không cá nhân hóa.
export const buildProfile = async (customerId) => {
    try {
        const [purchasedIds, likedDocs, viewedDocs] = await Promise.all([
            purchasedProductIds(customerId),
            YeuThich.find({ MaKH: customerId }, "MaSP").sort({ createdAt: -1 }).limit(LIMIT).lean(),
            LuotXemSanPham.find({ MaKH: customerId }, "MaSP").sort({ LanXemCuoi: -1 }).limit(LIMIT).lean(),
        ]);
        const likedIds = unique(likedDocs.map((d) => d.MaSP));
        const viewedIds = unique(viewedDocs.map((d) => d.MaSP));
        const allIds = unique([...purchasedIds, ...likedIds, ...viewedIds]);
        if (!allIds.length) return null;
        const products = await SanPham.find({ _id: { $in: allIds }, DaAn: false }).populate("MaTH", "TenTH").lean();
        const byId = new Map(products.map((p) => [String(p._id), toProfileProduct(p)]));
        const pick = (ids) => ids.map((id) => byId.get(id)).filter(Boolean);
        const profile = { purchased: pick(purchasedIds), liked: pick(likedIds), viewed: pick(viewedIds) };
        return profile.purchased.length || profile.liked.length || profile.viewed.length ? profile : null;
    } catch (error) {
        console.error("Không dựng được hồ sơ gu khách hàng:", error.message);
        return null;
    }
};

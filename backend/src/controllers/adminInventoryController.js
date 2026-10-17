import SanPham, { boDau } from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";
import HinhAnh from "../models/HinhAnh.js";
// import để Mongoose đăng ký đủ model cho populate
import "../models/DungTich.js";
import "../models/ThuongHieu.js";
import {
    MAX_TON,
    TRANG_THAI_KHO,
    docNguong,
    kiemTraDieuChinh,
    phanLoaiTon
} from "../libs/inventoryRules.js";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

// Kho hiện không có model riêng: tồn kho là SanPhamDungTich.SoLuongCo của từng biến thể (sản phẩm + dung tích).
// Dựng các dòng trả về từ danh sách biến thể (lean, đã populate).
const dinhDangHang = async (bienThes, nguong) => {
    const spIds = [...new Set(bienThes.map((b) => b.MaSP?._id).filter(Boolean).map(String))];
    const anhTheoSP = new Map();
    if (spIds.length) {
        const anh = await HinhAnh.find({ MaSP: { $in: spIds } })
            .sort({ LaAnhChinh: -1, ThuTu: 1 })
            .select("MaSP DuongDan")
            .lean();
        for (const a of anh) {
            const k = String(a.MaSP);
            if (!anhTheoSP.has(k)) anhTheoSP.set(k, a.DuongDan);
        }
    }

    return bienThes.map((b) => ({
        _id: b._id,
        SoLuongCo: b.SoLuongCo,
        Gia: b.Gia,
        DungTich: b.MaDungTich?.TenDungTich ?? null,
        TinhTrang: phanLoaiTon(b.SoLuongCo, nguong),
        SanPham: b.MaSP
            ? {
                  _id: b.MaSP._id,
                  TenSP: b.MaSP.TenSP,
                  TenTH: b.MaSP.MaTH?.TenTH ?? "",
                  DaAn: b.MaSP.DaAn === true,
                  AnhChinh: anhTheoSP.get(String(b.MaSP._id)) ?? null
              }
            : null,
        updatedAt: b.updatedAt
    }));
};

const populateBienThe = (query) =>
    query
        .populate("MaDungTich", "TenDungTich")
        .populate({ path: "MaSP", select: "TenSP MaTH DaAn", populate: { path: "MaTH", select: "TenTH" } });

// ---------- GET /api/admin/inventory?page=&limit=&q=&trangthai=&nguong= ----------
// trangthai: all | hethang (tồn = 0) | saphet (1..nguong) | conhang (> nguong). Mặc định xếp tồn ít nhất lên đầu.
export const listInventory = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        if (page === null || limitRaw === null) {
            return res.status(400).json({ message: "page và limit phải là số nguyên dương" });
        }
        const limit = Math.min(limitRaw, MAX_LIMIT);

        const ng = docNguong(req.query.nguong);
        if (ng.error) return res.status(400).json({ message: ng.error });
        const nguong = ng.value;

        const tt = req.query.trangthai;
        if (tt !== undefined && tt !== "" && tt !== "all" && !TRANG_THAI_KHO.includes(tt)) {
            return res.status(400).json({
                message: `trangthai không hợp lệ. Chỉ nhận: all, ${TRANG_THAI_KHO.join(", ")}`
            });
        }

        // tìm theo tên sản phẩm, không phân biệt dấu và hoa thường
        const base = {};
        const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
        if (q) {
            const sp = await SanPham.find({ TenKhongDau: new RegExp(escapeRegex(boDau(q)), "i") })
                .select("_id")
                .lean();
            base.MaSP = { $in: sp.map((s) => s._id) };
        }

        const dieuKien = {
            hethang: { $lte: 0 },
            saphet: { $gt: 0, $lte: nguong },
            conhang: { $gt: nguong }
        };
        const filter = tt && tt !== "all" ? { ...base, SoLuongCo: dieuKien[tt] } : base;

        const [docs, tk] = await Promise.all([
            populateBienThe(
                SanPhamDungTich.find(filter)
                    .sort({ SoLuongCo: 1, _id: 1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
            ).lean(),
            SanPhamDungTich.aggregate([
                { $match: base },
                {
                    $group: {
                        _id: null,
                        all: { $sum: 1 },
                        hethang: { $sum: { $cond: [{ $lte: ["$SoLuongCo", 0] }, 1, 0] } },
                        saphet: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $gt: ["$SoLuongCo", 0] }, { $lte: ["$SoLuongCo", nguong] }] },
                                    1,
                                    0
                                ]
                            }
                        },
                        conhang: { $sum: { $cond: [{ $gt: ["$SoLuongCo", nguong] }, 1, 0] } },
                        tongTon: { $sum: "$SoLuongCo" }
                    }
                }
            ])
        ]);

        const t = tk[0] ?? {};
        const counts = {
            all: t.all ?? 0,
            hethang: t.hethang ?? 0,
            saphet: t.saphet ?? 0,
            conhang: t.conhang ?? 0
        };
        const total = counts[tt && tt !== "all" ? tt : "all"];

        return res.status(200).json({
            data: await dinhDangHang(docs, nguong),
            counts,
            tongTon: t.tongTon ?? 0,
            nguong,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Lỗi khi gọi listInventory", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- PATCH /api/admin/inventory/:id ----------
// body: { ThayDoi: n } cộng/trừ vào tồn hiện tại, hoặc { SoLuongCo: n } đặt lại số lượng.
// Cộng/trừ dùng $inc có điều kiện nên không ghi đè nhầm khi cùng lúc có khách đặt hàng và không để tồn âm.
export const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const { error, data } = kiemTraDieuChinh(req.body);
        if (error) return res.status(400).json({ message: error });

        let capNhat;
        if (data.kieu === "set") {
            capNhat = await SanPhamDungTich.findOneAndUpdate(
                { _id: id },
                { $set: { SoLuongCo: data.giaTri } },
                { new: true, runValidators: true }
            ).lean();
        } else {
            const n = data.giaTri;
            capNhat = await SanPhamDungTich.findOneAndUpdate(
                { _id: id, SoLuongCo: { $gte: -n, $lte: MAX_TON - n } },
                { $inc: { SoLuongCo: n } },
                { new: true }
            ).lean();
        }

        if (!capNhat) {
            const hienTai = await SanPhamDungTich.findById(id).select("SoLuongCo").lean();
            if (!hienTai) return res.status(404).json({ message: "Không tìm thấy biến thể" });
            // chỉ còn trường hợp cộng/trừ làm tồn ra ngoài khoảng cho phép
            return res.status(409).json({
                message:
                    data.giaTri < 0
                        ? `Không thể giảm ${-data.giaTri}: tồn hiện tại chỉ còn ${hienTai.SoLuongCo}`
                        : `Tồn kho tối đa là ${MAX_TON}, hiện đang là ${hienTai.SoLuongCo}`
            });
        }

        const ng = docNguong(req.query.nguong);
        const [row] = await dinhDangHang(
            [await populateBienThe(SanPhamDungTich.findById(id)).lean()],
            ng.error ? undefined : ng.value
        );
        return res.status(200).json({ message: "Đã cập nhật tồn kho", data: row });
    } catch (error) {
        console.error("Lỗi khi gọi adjustStock", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

import Voucher from "../models/Voucher.js";
import DonHang from "../models/DonHang.js";
import { TINH_TRANG_VOUCHER, kiemTraDuLieu, tinhTrang } from "../libs/voucherRules.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

// Số đơn dùng từng voucher: SoDon = mọi đơn gắn voucher; DaDung = đơn chưa hủy (tính vào hạn mức lượt dùng)
const thongKeDung = async () => {
    const rows = await DonHang.aggregate([
        { $match: { MaVoucher: { $ne: null } } },
        {
            $group: {
                _id: "$MaVoucher",
                SoDon: { $sum: 1 },
                DaDung: { $sum: { $cond: [{ $eq: ["$TrangThai", "Đã hủy"] }, 0, 1] } }
            }
        }
    ]);
    return new Map(rows.map((r) => [String(r._id), { SoDon: r.SoDon, DaDung: r.DaDung }]));
};

const thongKeMotVoucher = async (id) => {
    const [r] = await DonHang.aggregate([
        { $match: { MaVoucher: id } },
        {
            $group: {
                _id: null,
                SoDon: { $sum: 1 },
                DaDung: { $sum: { $cond: [{ $eq: ["$TrangThai", "Đã hủy"] }, 0, 1] } }
            }
        }
    ]);
    return { SoDon: r?.SoDon ?? 0, DaDung: r?.DaDung ?? 0 };
};

// Voucher tạo từ bản cũ chưa có một số trường -> điền giá trị mặc định khi trả về
const dinhDang = (v, tk, now = new Date()) => ({
    _id: v._id,
    MaCode: v.MaCode ?? null,
    LoaiGiam: v.LoaiGiam ?? "tien",
    GiaTri: v.GiaTri,
    GiamToiDa: v.GiamToiDa ?? null,
    DonToiThieu: v.DonToiThieu ?? 0,
    SoLuong: v.SoLuong ?? null,
    DangBat: v.DangBat ?? true,
    NgayBatDau: v.NgayBatDau,
    NgayKetThuc: v.NgayKetThuc,
    DaDung: tk.DaDung,
    SoDon: tk.SoDon,
    TinhTrang: tinhTrang(v, tk.DaDung, now),
    createdAt: v.createdAt,
    updatedAt: v.updatedAt
});

// ---------- GET /api/admin/vouchers?page=&limit=&q=&trangthai= ----------
// Số voucher của một cửa hàng nhỏ (vài chục đến vài trăm) và "tình trạng" phụ thuộc cả ngày lẫn lượt dùng,
// nên đọc hết rồi lọc / phân trang trong bộ nhớ để số đếm trên các tab luôn khớp với danh sách.
export const listVouchers = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        if (page === null || limitRaw === null) {
            return res.status(400).json({ message: "page và limit phải là số nguyên dương" });
        }
        const limit = Math.min(limitRaw, MAX_LIMIT);

        const tt = req.query.trangthai;
        if (tt !== undefined && tt !== "" && tt !== "all" && !TINH_TRANG_VOUCHER.includes(tt)) {
            return res.status(400).json({
                message: `trangthai không hợp lệ. Chỉ nhận: all, ${TINH_TRANG_VOUCHER.join(", ")}`
            });
        }

        const filter = {};
        const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 50) : "";
        if (q) filter.MaCode = new RegExp(escapeRegex(q), "i");

        const [docs, tk] = await Promise.all([
            Voucher.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
            thongKeDung()
        ]);

        const now = new Date();
        const rows = docs.map((v) => dinhDang(v, tk.get(String(v._id)) ?? { SoDon: 0, DaDung: 0 }, now));

        // số voucher theo từng tình trạng (theo từ khóa đang tìm) để hiện trên các tab
        const counts = { all: rows.length };
        for (const t of TINH_TRANG_VOUCHER) counts[t] = 0;
        for (const r of rows) counts[r.TinhTrang] += 1;

        const loc = tt && tt !== "all" ? rows.filter((r) => r.TinhTrang === tt) : rows;
        const total = loc.length;
        const data = loc.slice((page - 1) * limit, page * limit);

        return res.status(200).json({
            data,
            counts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Lỗi khi gọi listVouchers", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- GET /api/admin/vouchers/:id ----------
export const getVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const v = await Voucher.findById(id).lean();
        if (!v) return res.status(404).json({ message: "Không tìm thấy voucher" });

        return res.status(200).json({ data: dinhDang(v, await thongKeMotVoucher(v._id)) });
    } catch (error) {
        console.error("Lỗi khi gọi getVoucher", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

const trungMa = (code, boQuaId) =>
    Voucher.exists({ MaCode: code, ...(boQuaId ? { _id: { $ne: boQuaId } } : {}) });

// ---------- POST /api/admin/vouchers ----------
// body: { MaCode, LoaiGiam: "tien" | "phantram", GiaTri, GiamToiDa?, DonToiThieu?, SoLuong?, DangBat?,
//         NgayBatDau: "YYYY-MM-DD", NgayKetThuc: "YYYY-MM-DD" }
export const createVoucher = async (req, res) => {
    try {
        const { error, status, data } = kiemTraDuLieu(req.body);
        if (error) return res.status(status).json({ message: error });

        if (await trungMa(data.MaCode)) {
            return res.status(409).json({ message: "Mã voucher này đã tồn tại" });
        }

        const doc = await Voucher.create(data);
        return res.status(201).json({
            message: "Đã thêm voucher",
            data: dinhDang(doc.toObject(), { SoDon: 0, DaDung: 0 })
        });
    } catch (error) {
        // 2 người cùng tạo một mã trong cùng lúc: lọt qua bước kiểm tra trùng thì chỉ mục unique chặn lại
        if (error?.code === 11000) return res.status(409).json({ message: "Mã voucher này đã tồn tại" });
        console.error("Lỗi khi gọi createVoucher", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- PUT /api/admin/vouchers/:id ----------
// Gửi trường nào cập nhật trường đó (bật/tắt voucher chỉ cần gửi { DangBat }).
export const updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const current = await Voucher.findById(id).lean();
        if (!current) return res.status(404).json({ message: "Không tìm thấy voucher" });

        const tk = await thongKeMotVoucher(current._id);
        const { error, status, data } = kiemTraDuLieu(req.body, {
            current,
            soDon: tk.SoDon,
            daDung: tk.DaDung
        });
        if (error) return res.status(status).json({ message: error });

        if (data.MaCode !== undefined && (await trungMa(data.MaCode, id))) {
            return res.status(409).json({ message: "Mã voucher này đã tồn tại" });
        }

        const doc = await Voucher.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
        return res.status(200).json({ message: "Đã cập nhật voucher", data: dinhDang(doc, tk) });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: "Mã voucher này đã tồn tại" });
        console.error("Lỗi khi gọi updateVoucher", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- DELETE /api/admin/vouchers/:id (chỉ admin) ----------
export const removeVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        if (!(await Voucher.exists({ _id: id }))) {
            return res.status(404).json({ message: "Không tìm thấy voucher" });
        }
        // đơn hàng cũ vẫn trỏ tới voucher này nên đã dùng rồi thì chỉ cho tắt, không cho xóa
        if (await DonHang.exists({ MaVoucher: id })) {
            return res.status(409).json({
                message: "Voucher đã được dùng trong đơn hàng nên không thể xóa. Hãy tắt voucher thay vì xóa"
            });
        }

        await Voucher.deleteOne({ _id: id });
        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi khi gọi removeVoucher", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

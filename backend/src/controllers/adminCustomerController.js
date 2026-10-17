import KhachHang from "../models/KhachHang.js";
import DonHang from "../models/DonHang.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;
const MOT_NGAY_MS = 24 * 60 * 60 * 1000;

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

// moi: mới đăng ký trước | chitieu: chi tiêu cao nhất trước | sodon: nhiều đơn nhất trước
const SAP_XEP = {
    moi: { createdAt: -1, _id: -1 },
    chitieu: { TongChiTieu: -1, createdAt: -1, _id: -1 },
    sodon: { SoDon: -1, TongChiTieu: -1, _id: -1 }
};

// Chi tiêu chỉ tính các đơn chưa hủy (gồm cả đơn đang xử lý / đang giao)
const KHONG_HUY = { TrangThai: { $ne: "Đã hủy" } };

// ---------- GET /api/admin/customers?page=&limit=&q=&sapxep= ----------
// q: tìm theo họ tên, email, số điện thoại. Không bao giờ trả mật khẩu.
export const listCustomers = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        if (page === null || limitRaw === null) {
            return res.status(400).json({ message: "page và limit phải là số nguyên dương" });
        }
        const limit = Math.min(limitRaw, MAX_LIMIT);

        const sapxep = req.query.sapxep === undefined || req.query.sapxep === "" ? "moi" : req.query.sapxep;
        if (!Object.hasOwn(SAP_XEP, sapxep)) {
            return res.status(400).json({ message: `sapxep không hợp lệ. Chỉ nhận: ${Object.keys(SAP_XEP).join(", ")}` });
        }

        const filter = {};
        const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 50) : "";
        if (q) {
            const regex = new RegExp(escapeRegex(q), "i");
            filter.$or = [
                { Ho: regex },
                { Ten: regex },
                { Email: regex },
                { SoDienThoai: regex },
                // gõ cả họ tên liền nhau, ví dụ "Nguyễn Minh Anh"
                { $expr: { $regexMatch: { input: { $concat: ["$Ho", " ", "$Ten"] }, regex: escapeRegex(q), options: "i" } } }
            ];
        }

        const [kq, tongKhach, moi30Ngay, daMua] = await Promise.all([
            KhachHang.aggregate([
                { $match: filter },
                {
                    $lookup: {
                        from: DonHang.collection.name,
                        let: { kh: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$MaKH", "$$kh"] }, ...KHONG_HUY } },
                            {
                                $group: {
                                    _id: null,
                                    SoDon: { $sum: 1 },
                                    TongChiTieu: { $sum: "$TongTien" },
                                    LanMuaCuoi: { $max: "$NgayDat" }
                                }
                            }
                        ],
                        as: "tk"
                    }
                },
                {
                    $addFields: {
                        SoDon: { $ifNull: [{ $arrayElemAt: ["$tk.SoDon", 0] }, 0] },
                        TongChiTieu: { $ifNull: [{ $arrayElemAt: ["$tk.TongChiTieu", 0] }, 0] },
                        LanMuaCuoi: { $arrayElemAt: ["$tk.LanMuaCuoi", 0] }
                    }
                },
                { $sort: SAP_XEP[sapxep] },
                {
                    $facet: {
                        rows: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            { $project: { MatKhau: 0, tk: 0, __v: 0 } }
                        ],
                        total: [{ $count: "n" }]
                    }
                }
            ]),
            KhachHang.countDocuments(),
            KhachHang.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * MOT_NGAY_MS) } }),
            DonHang.aggregate([{ $match: KHONG_HUY }, { $group: { _id: "$MaKH" } }, { $count: "n" }])
        ]);

        const total = kq[0]?.total[0]?.n ?? 0;
        const data = (kq[0]?.rows ?? []).map((k) => ({
            _id: k._id,
            Ho: k.Ho,
            Ten: k.Ten,
            Email: k.Email,
            SoDienThoai: k.SoDienThoai,
            SoDon: k.SoDon,
            TongChiTieu: k.TongChiTieu,
            LanMuaCuoi: k.LanMuaCuoi ?? null,
            createdAt: k.createdAt,
            updatedAt: k.updatedAt
        }));

        return res.status(200).json({
            data,
            summary: { TongKhach: tongKhach, MoiTrong30Ngay: moi30Ngay, DaMuaHang: daMua[0]?.n ?? 0 },
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Lỗi khi gọi listCustomers", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- GET /api/admin/customers/:id ----------
// Thông tin khách + thống kê mua hàng + 10 đơn gần nhất (xem chi tiết đơn qua /api/admin/orders/:id)
export const getCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const khach = await KhachHang.findById(id).select("-MatKhau").lean();
        if (!khach) return res.status(404).json({ message: "Không tìm thấy khách hàng" });

        const [nhom, donGanDay] = await Promise.all([
            DonHang.aggregate([
                { $match: { MaKH: khach._id } },
                { $group: { _id: "$TrangThai", n: { $sum: 1 }, tien: { $sum: "$TongTien" }, cuoi: { $max: "$NgayDat" } } }
            ]),
            DonHang.find({ MaKH: khach._id })
                .sort({ NgayDat: -1, _id: -1 })
                .limit(10)
                .select("NgayDat TongTien TrangThai")
                .lean()
        ]);

        let soDon = 0;
        let soDonHuy = 0;
        let soDonHoanThanh = 0;
        let tongChiTieu = 0;
        let lanMuaCuoi = null;
        for (const g of nhom) {
            if (g._id === "Đã hủy") {
                soDonHuy += g.n;
                continue;
            }
            soDon += g.n;
            tongChiTieu += g.tien;
            if (g._id === "Hoàn thành") soDonHoanThanh += g.n;
            if (!lanMuaCuoi || g.cuoi > lanMuaCuoi) lanMuaCuoi = g.cuoi;
        }

        return res.status(200).json({
            data: {
                _id: khach._id,
                Ho: khach.Ho,
                Ten: khach.Ten,
                Email: khach.Email,
                SoDienThoai: khach.SoDienThoai,
                createdAt: khach.createdAt,
                updatedAt: khach.updatedAt,
                SoDon: soDon,
                SoDonHoanThanh: soDonHoanThanh,
                SoDonHuy: soDonHuy,
                TongChiTieu: tongChiTieu,
                LanMuaCuoi: lanMuaCuoi,
                DonGanDay: donGanDay.map((d) => ({
                    _id: d._id,
                    NgayDat: d.NgayDat,
                    TongTien: d.TongTien,
                    TrangThai: d.TrangThai
                }))
            }
        });
    } catch (error) {
        console.error("Lỗi khi gọi getCustomer", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

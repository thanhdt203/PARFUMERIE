import DonHang, { TRANG_THAI_DON_HANG } from "../models/DonHang.js";
import ChiTietDonHang from "../models/ChiTietDonHang.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";
import HinhAnh from "../models/HinhAnh.js";
// import để Mongoose đăng ký đủ model cho populate
import "../models/PhuongThucThanhToan.js";
import "../models/NhanVien.js";
import "../models/Voucher.js";
import "../models/SanPham.js";
import "../models/DungTich.js";
import "../models/ThuongHieu.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;
const EXPORT_MAX = 5000;
const MUI_GIO_VN = "+07:00";
const MOT_NGAY_MS = 24 * 60 * 60 * 1000;

// true: khi hủy đơn thì cộng lại số lượng vào kho (SoLuongCo).
// Chỉ nên để true khi lúc đặt hàng đã TRỪ kho tương ứng.
const HOAN_KHO_KHI_HUY = true;

// Trạng thái hiện tại -> các trạng thái được phép chuyển tới
// (giữ khớp với frontend/src/lib/orderStatus.ts)
const CHUYEN_TRANG_THAI = {
    "Chờ xác nhận": ["Đang xử lý", "Đã hủy"],
    "Đang xử lý": ["Đang giao", "Đã hủy"],
    "Đang giao": ["Hoàn thành", "Đã hủy"],
    "Hoàn thành": [],
    "Đã hủy": []
};

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

// ---------- Bộ lọc dùng chung cho danh sách / đếm / xuất CSV ----------

// "2026-10-15" -> 00:00 ngày đó theo giờ Việt Nam
const parseNgay = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00${MUI_GIO_VN}`);
    return Number.isNaN(d.getTime()) ? null : d;
};

// Lọc theo từ khóa và ngày đặt (chưa gồm trạng thái, để còn đếm số đơn theo từng trạng thái)
const buildBaseFilter = (query) => {
    const filter = {};

    const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
    if (q) {
        const regex = new RegExp(escapeRegex(q), "i");
        const or = [
            { HoTenKH: regex },
            { HoTenNguoiNhan: regex },
            { SoDienThoai: regex },
            { SoDienThoaiNguoiNhan: regex },
            { Email: regex }
        ];
        // mã đơn hiển thị là 6 ký tự cuối của _id (ví dụ #A1B2C3)
        const maDon = q.match(/^#?([0-9a-f]{6})$/i);
        if (maDon) {
            or.push({
                $expr: {
                    $regexMatch: { input: { $toString: "$_id" }, regex: `${maDon[1]}$`, options: "i" }
                }
            });
        }
        filter.$or = or;
    }

    const { tu, den } = query;
    const range = {};
    if (tu !== undefined && tu !== "") {
        const start = parseNgay(tu);
        if (!start) return { error: "Ngày bắt đầu không hợp lệ (định dạng YYYY-MM-DD)" };
        range.$gte = start;
    }
    if (den !== undefined && den !== "") {
        const end = parseNgay(den);
        if (!end) return { error: "Ngày kết thúc không hợp lệ (định dạng YYYY-MM-DD)" };
        range.$lt = new Date(end.getTime() + MOT_NGAY_MS); // gồm cả ngày kết thúc
    }
    if (range.$gte && range.$lt && range.$gte >= range.$lt) {
        return { error: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" };
    }
    if (Object.keys(range).length) filter.NgayDat = range;

    return { filter };
};

const readTrangThai = (value) => {
    if (value === undefined || value === "" || value === "all") return { value: null };
    if (!TRANG_THAI_DON_HANG.includes(value)) {
        return { error: `trangthai không hợp lệ. Chỉ nhận: all, ${TRANG_THAI_DON_HANG.join(", ")}` };
    }
    return { value };
};

// ---------- Danh sách ----------

export const listOrders = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        if (page === null || limitRaw === null) {
            return res.status(400).json({ message: "page và limit phải là số nguyên dương" });
        }
        const limit = Math.min(limitRaw, MAX_LIMIT);

        const base = buildBaseFilter(req.query);
        if (base.error) return res.status(400).json({ message: base.error });
        const tt = readTrangThai(req.query.trangthai);
        if (tt.error) return res.status(400).json({ message: tt.error });

        const filter = tt.value ? { ...base.filter, TrangThai: tt.value } : base.filter;

        const [docs, total, nhom] = await Promise.all([
            DonHang.find(filter)
                .sort({ NgayDat: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("MaPTTT", "TenPTTT")
                .lean(),
            DonHang.countDocuments(filter),
            DonHang.aggregate([{ $match: base.filter }, { $group: { _id: "$TrangThai", n: { $sum: 1 } } }])
        ]);

        // số đơn theo từng trạng thái (theo từ khóa và ngày đang lọc) để hiện trên các tab
        const counts = { all: 0 };
        for (const t of TRANG_THAI_DON_HANG) counts[t] = 0;
        for (const g of nhom) {
            counts.all += g.n;
            if (g._id in counts) counts[g._id] = g.n;
        }

        // tổng số lượng sản phẩm của từng đơn trong trang này
        const ids = docs.map((d) => d._id);
        const tongSoLuong = new Map();
        if (ids.length) {
            const rows = await ChiTietDonHang.aggregate([
                { $match: { MaDH: { $in: ids } } },
                { $group: { _id: "$MaDH", n: { $sum: "$SoLuongMua" } } }
            ]);
            for (const r of rows) tongSoLuong.set(String(r._id), r.n);
        }

        const data = docs.map((d) => ({
            _id: d._id,
            NgayDat: d.NgayDat,
            TongTien: d.TongTien,
            TrangThai: d.TrangThai,
            HoTenKH: d.HoTenKH,
            SoDienThoai: d.SoDienThoai,
            HoTenNguoiNhan: d.HoTenNguoiNhan,
            PhuongThucThanhToan: d.MaPTTT ? { _id: d.MaPTTT._id, TenPTTT: d.MaPTTT.TenPTTT } : null,
            TongSoLuong: tongSoLuong.get(String(d._id)) ?? 0
        }));

        return res.status(200).json({
            data,
            counts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Lỗi khi gọi listOrders", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- Chi tiết ----------

const layChiTiet = async (id) => {
    const don = await DonHang.findById(id)
        .populate("MaPTTT", "TenPTTT")
        .populate("MaNV", "HoTenNV")
        .populate("MaVoucher", "MaCode GiaTri NgayBatDau NgayKetThuc")
        .lean();
    if (!don) return null;

    const dong = await ChiTietDonHang.find({ MaDH: id })
        .populate({
            path: "MaSPDungTich",
            populate: [
                { path: "MaDungTich", select: "TenDungTich" },
                { path: "MaSP", select: "TenSP MaTH", populate: { path: "MaTH", select: "TenTH" } }
            ]
        })
        .lean();

    // ảnh đại diện của từng sản phẩm (ảnh chính trước, rồi theo thứ tự)
    const spIds = [...new Set(dong.map((d) => d.MaSPDungTich?.MaSP?._id).filter(Boolean).map(String))];
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

    const chiTiet = dong.map((d) => {
        const bienThe = d.MaSPDungTich;
        const sp = bienThe?.MaSP;
        return {
            _id: d._id,
            SoLuongMua: d.SoLuongMua,
            DonGia: d.DonGia,
            ThanhTien: d.SoLuongMua * d.DonGia,
            DungTich: bienThe?.MaDungTich?.TenDungTich ?? null,
            SanPham: sp
                ? {
                      _id: sp._id,
                      TenSP: sp.TenSP,
                      TenTH: sp.MaTH?.TenTH ?? "",
                      AnhChinh: anhTheoSP.get(String(sp._id)) ?? null
                  }
                : null
        };
    });

    return {
        _id: don._id,
        NgayDat: don.NgayDat,
        TongTien: don.TongTien,
        TamTinh: chiTiet.reduce((sum, d) => sum + d.ThanhTien, 0),
        TrangThai: don.TrangThai,
        GhiChu: don.GhiChu ?? "",
        HoTenKH: don.HoTenKH,
        Email: don.Email,
        SoDienThoai: don.SoDienThoai,
        DiaChi: don.DiaChi,
        HoTenNguoiNhan: don.HoTenNguoiNhan,
        SoDienThoaiNguoiNhan: don.SoDienThoaiNguoiNhan,
        DiaChiNguoiNhan: don.DiaChiNguoiNhan,
        MaKH: don.MaKH,
        PhuongThucThanhToan: don.MaPTTT ? { _id: don.MaPTTT._id, TenPTTT: don.MaPTTT.TenPTTT } : null,
        NhanVien: don.MaNV ? { _id: don.MaNV._id, HoTenNV: don.MaNV.HoTenNV } : null,
        Voucher: don.MaVoucher
            ? { _id: don.MaVoucher._id, MaCode: don.MaVoucher.MaCode ?? null, GiaTri: don.MaVoucher.GiaTri }
            : null,
        ChiTiet: chiTiet,
        createdAt: don.createdAt,
        updatedAt: don.updatedAt
    };
};

export const getOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const data = await layChiTiet(id);
        if (!data) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Lỗi khi gọi getOrder", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- Đổi trạng thái ----------

const hoanKho = async (maDH) => {
    const dong = await ChiTietDonHang.find({ MaDH: maDH }).select("MaSPDungTich SoLuongMua").lean();
    if (!dong.length) return;
    await SanPhamDungTich.bulkWrite(
        dong.map((d) => ({
            updateOne: {
                filter: { _id: d.MaSPDungTich },
                update: { $inc: { SoLuongCo: d.SoLuongMua } }
            }
        }))
    );
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const trangThaiMoi = req.body?.TrangThai;
        if (!TRANG_THAI_DON_HANG.includes(trangThaiMoi)) {
            return res.status(400).json({
                message: `TrangThai không hợp lệ. Chỉ nhận: ${TRANG_THAI_DON_HANG.join(", ")}`
            });
        }

        const hienTai = await DonHang.findById(id).select("TrangThai MaNV").lean();
        if (!hienTai) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

        if (hienTai.TrangThai === trangThaiMoi) {
            return res.status(409).json({ message: `Đơn hàng đã ở trạng thái "${trangThaiMoi}"` });
        }
        const duocPhep = CHUYEN_TRANG_THAI[hienTai.TrangThai] ?? [];
        if (!duocPhep.includes(trangThaiMoi)) {
            return res.status(409).json({
                message: `Không thể chuyển đơn từ "${hienTai.TrangThai}" sang "${trangThaiMoi}"`
            });
        }

        // Chỉ cập nhật nếu trạng thái vẫn như lúc đọc: tránh 2 người đổi cùng lúc (và hoàn kho 2 lần)
        const set = { TrangThai: trangThaiMoi };
        if (!hienTai.MaNV) set.MaNV = req.user._id; // người đầu tiên xử lý đơn được gán vào đơn
        const daDoi = await DonHang.findOneAndUpdate(
            { _id: id, TrangThai: hienTai.TrangThai },
            { $set: set },
            { new: true }
        ).select("_id");
        if (!daDoi) {
            return res.status(409).json({ message: "Đơn hàng vừa được người khác cập nhật, hãy tải lại" });
        }

        if (trangThaiMoi === "Đã hủy" && HOAN_KHO_KHI_HUY) {
            try {
                await hoanKho(id);
            } catch (e) {
                // hoàn kho lỗi thì trả đơn về trạng thái cũ, tránh đơn đã hủy mà kho chưa được cộng
                await DonHang.updateOne(
                    { _id: id, TrangThai: "Đã hủy" },
                    { $set: { TrangThai: hienTai.TrangThai } }
                );
                throw e;
            }
        }

        const data = await layChiTiet(id);
        return res.status(200).json({ message: "Đã cập nhật trạng thái đơn hàng", data });
    } catch (error) {
        console.error("Lỗi khi gọi updateOrderStatus", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- Xuất CSV ----------

const dinhDangNgay = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
});

// chặn công thức Excel (=, +, -, @) và escape dấu ", dấu phẩy, xuống dòng
const csvCell = (value) => {
    let s = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// số điện thoại: ép Excel hiểu là chữ để không mất số 0 đầu (chỉ giữ ký tự số và dấu thường gặp)
const csvPhone = (value) => {
    const s = String(value ?? "").replace(/[^\d+\s.-]/g, "");
    return `"=""${s}"""`;
};

export const exportOrders = async (req, res) => {
    try {
        const base = buildBaseFilter(req.query);
        if (base.error) return res.status(400).json({ message: base.error });
        const tt = readTrangThai(req.query.trangthai);
        if (tt.error) return res.status(400).json({ message: tt.error });

        const filter = tt.value ? { ...base.filter, TrangThai: tt.value } : base.filter;
        const docs = await DonHang.find(filter)
            .sort({ NgayDat: -1, _id: -1 })
            .limit(EXPORT_MAX)
            .populate("MaPTTT", "TenPTTT")
            .lean();

        const header = [
            "Mã đơn", "Ngày đặt", "Trạng thái", "Khách hàng", "SĐT khách", "Email",
            "Người nhận", "SĐT người nhận", "Địa chỉ nhận", "Thanh toán", "Tổng tiền (VND)", "Ghi chú"
        ];
        const lines = [header.map(csvCell).join(",")];
        for (const d of docs) {
            lines.push([
                csvCell(`#${String(d._id).slice(-6).toUpperCase()}`),
                csvCell(dinhDangNgay.format(d.NgayDat).replace(", ", " ")),
                csvCell(d.TrangThai),
                csvCell(d.HoTenKH),
                csvPhone(d.SoDienThoai),
                csvCell(d.Email),
                csvCell(d.HoTenNguoiNhan),
                csvPhone(d.SoDienThoaiNguoiNhan),
                csvCell(d.DiaChiNguoiNhan),
                csvCell(d.MaPTTT?.TenPTTT ?? ""),
                csvCell(d.TongTien),
                csvCell(d.GhiChu)
            ].join(","));
        }

        const ngay = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="don-hang-${ngay}.csv"`);
        // BOM để Excel đọc đúng tiếng Việt
        return res.status(200).send(`\uFEFF${lines.join("\r\n")}`);
    } catch (error) {
        console.error("Lỗi khi gọi exportOrders", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

import SanPham, { boDau, GIOI_TINH, NHOM_HUONG } from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";
import HinhAnh from "../models/HinhAnh.js";
import LuotXemSanPham from "../models/LuotXemSanPham.js";
import ThuongHieu from "../models/ThuongHieu.js";
import DungTich from "../models/DungTich.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

const SORT_MAP = {
    moi: { createdAt: -1 },
    pho_bien: { LuotXem: -1 },
    gia_tang: { GiaThapNhat: 1 },
    gia_giam: { GiaThapNhat: -1 },
    ten: { TenKhongDau: 1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// "2" -> 2, undefined -> mặc định, "abc" / "0" / "-1" / "1.5" -> null (không hợp lệ)
const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

// "a,b" hoặc ?x=a&x=b -> ["a", "b"]
const parseList = (value) => {
    if (value === undefined) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .flatMap((v) => String(v).split(","))
        .map((s) => s.trim())
        .filter(Boolean);
};

// "3000000" -> 3000000, undefined -> undefined, "abc" / "-5" -> null (không hợp lệ)
const parseNonNegativeNumber = (value) => {
    if (value === undefined || value === "") return undefined;
    if (!/^\d+(\.\d+)?$/.test(String(value))) return null;
    return Number(value);
};

export const parseFilterQuery = (query) => {
    const spFilter = { DaAn: false };
    const bienTheFilter = {};

    const thuongHieu = parseList(query.thuonghieu);
    if (thuongHieu.length) {
        if (!thuongHieu.every(isObjectId)) {
            return { error: "thuonghieu chứa mã không hợp lệ" };
        }
        spFilter.MaTH = { $in: thuongHieu };
    }

    const danhMuc = parseList(query.danhmuc);
    if (danhMuc.length) {
        if (!danhMuc.every(isObjectId)) {
            return { error: "danhmuc chứa mã không hợp lệ" };
        }
        spFilter.MaDM = { $in: danhMuc };
    }

    const gioiTinh = parseList(query.gioitinh).map((s) => s.toLowerCase());
    if (gioiTinh.length) {
        if (!gioiTinh.every((g) => GIOI_TINH.includes(g))) {
            return { error: `gioitinh không hợp lệ. Chỉ nhận: ${GIOI_TINH.join(", ")}` };
        }
        spFilter.GioiTinh = { $in: gioiTinh };
    }

    const nhomHuong = parseList(query.nhomhuong).map((s) => s.toLowerCase());
    if (nhomHuong.length) {
        if (!nhomHuong.every((n) => NHOM_HUONG.includes(n))) {
            return { error: `nhomhuong không hợp lệ. Chỉ nhận: ${NHOM_HUONG.join(", ")}` };
        }
        spFilter.NhomHuong = { $in: nhomHuong };
    }

    // nốt hương: khớp bất kỳ nốt nào trong 3 tầng đầu/giữa/cuối
    const notHuong = parseList(query.nothuong).map((s) => s.toLowerCase());
    if (notHuong.length) {
        spFilter.$or = [
            { "NotHuong.Dau": { $in: notHuong } },
            { "NotHuong.Giua": { $in: notHuong } },
            { "NotHuong.Cuoi": { $in: notHuong } },
        ];
    }

    const dungTich = parseList(query.dungtich);
    if (dungTich.length) {
        if (!dungTich.every(isObjectId)) {
            return { error: "dungtich chứa mã không hợp lệ" };
        }
        bienTheFilter.MaDungTich = { $in: dungTich };
    }

    const giaTu = parseNonNegativeNumber(query.giatu);
    const giaDen = parseNonNegativeNumber(query.giaden);
    if (giaTu === null) return { error: "giatu phải là số >= 0" };
    if (giaDen === null) return { error: "giaden phải là số >= 0" };
    if (giaTu !== undefined && giaDen !== undefined && giaTu > giaDen) {
        return { error: "giatu không được lớn hơn giaden" };
    }
    if (giaTu !== undefined || giaDen !== undefined) {
        bienTheFilter.Gia = {};
        if (giaTu !== undefined) bienTheFilter.Gia.$gte = giaTu;
        if (giaDen !== undefined) bienTheFilter.Gia.$lte = giaDen;
    }

    if (query.conhang !== undefined && query.conhang !== "") {
        if (query.conhang !== "true" && query.conhang !== "false") {
            return { error: "conhang chỉ nhận true hoặc false" };
        }
        if (query.conhang === "true") {
            bienTheFilter.SoLuongCo = { $gt: 0 };
        }
    }

    return { spFilter, bienTheFilter };
};

// GET /api/products
// Tham số: page, limit, q, sort,
//          thuonghieu, gioitinh, nhomhuong, nothuong, dungtich (mỗi giá trị cách nhau bằng dấu phẩy),
//          giatu, giaden, conhang
export const getProducts = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        let limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        const sortKey = req.query.sort ?? "moi";
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

        if (page === null) {
            return res.status(400).json({ message: "page phải là số nguyên >= 1" });
        }
        if (limit === null) {
            return res.status(400).json({ message: "limit phải là số nguyên >= 1" });
        }
        if (!SORT_MAP[sortKey]) {
            return res.status(400).json({
                message: `sort không hợp lệ. Chỉ nhận: ${Object.keys(SORT_MAP).join(", ")}`,
            });
        }
        if (q.length > 100) {
            return res.status(400).json({ message: "Từ khóa tìm kiếm tối đa 100 ký tự" });
        }
        limit = Math.min(limit, MAX_LIMIT);

        const parsed = parseFilterQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ message: parsed.error });
        }
        const { spFilter: filter, bienTheFilter } = parsed;

        // lọc theo dung tích / giá / còn hàng: tìm các sản phẩm có biến thể thỏa điều kiện
        if (Object.keys(bienTheFilter).length) {
            filter._id = { $in: await SanPhamDungTich.distinct("MaSP", bienTheFilter) };
        }

        if (q) {
            filter.TenKhongDau = { $regex: escapeRegex(boDau(q)), $options: "i" };
        }

        const [total, sanPhams] = await Promise.all([
            SanPham.countDocuments(filter),
            SanPham.find(filter)
                .sort({ ...SORT_MAP[sortKey], _id: 1 }) // _id để phân trang ổn định
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("MaTH", "TenTH")
                .populate("MaDM", "TenDM")
                .lean(),
        ]);

        const ids = sanPhams.map((sp) => sp._id);

        // ảnh chính + tình trạng còn hàng của các sản phẩm trong trang này
        const [hinhAnhs, bienThes] = await Promise.all([
            HinhAnh.find({ MaSP: { $in: ids } })
                .sort({ LaAnhChinh: -1, ThuTu: 1 })
                .lean(),
            SanPhamDungTich.find({ MaSP: { $in: ids } }, "MaSP SoLuongCo").lean(),
        ]);

        const anhChinh = new Map();
        for (const ha of hinhAnhs) {
            const key = String(ha.MaSP);
            if (!anhChinh.has(key)) anhChinh.set(key, ha.DuongDan);
        }
        const conHang = new Set(
            bienThes.filter((b) => b.SoLuongCo > 0).map((b) => String(b.MaSP))
        );

        const data = sanPhams.map((sp) => ({
            _id: sp._id,
            TenSP: sp.TenSP,
            MoTa: sp.MoTa,
            XuatXu: sp.XuatXu,
            GioiTinh: sp.GioiTinh,
            NhomHuong: sp.NhomHuong,
            GiaThapNhat: sp.GiaThapNhat,
            GiaCaoNhat: sp.GiaCaoNhat,
            ThuongHieu: sp.MaTH,
            DanhMuc: sp.MaDM,
            AnhChinh: anhChinh.get(String(sp._id)) ?? null,
            ConHang: conHang.has(String(sp._id)),
        }));

        return res.status(200).json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Lỗi khi gọi getProducts", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// GET /api/products/filters
// Trả về các lựa chọn cho thanh lọc (chỉ tính sản phẩm đang hiển thị)
export const getFilterOptions = async (req, res) => {
    try {
        const visible = { DaAn: false };

        const [maTHs, gioiTinhs, nhomHuongs, dau, giua, cuoi, maSPs, spReNhat, spDatNhat] =
            await Promise.all([
                SanPham.distinct("MaTH", visible),
                SanPham.distinct("GioiTinh", visible),
                SanPham.distinct("NhomHuong", visible),
                SanPham.distinct("NotHuong.Dau", visible),
                SanPham.distinct("NotHuong.Giua", visible),
                SanPham.distinct("NotHuong.Cuoi", visible),
                SanPham.distinct("_id", visible),
                SanPham.findOne(visible, "GiaThapNhat").sort({ GiaThapNhat: 1 }).lean(),
                SanPham.findOne(visible, "GiaCaoNhat").sort({ GiaCaoNhat: -1 }).lean(),
            ]);

        const maDungTichs = await SanPhamDungTich.distinct("MaDungTich", { MaSP: { $in: maSPs } });

        const [thuongHieu, dungTich] = await Promise.all([
            ThuongHieu.find({ _id: { $in: maTHs } }, "TenTH").sort({ TenTH: 1 }).lean(),
            DungTich.find({ _id: { $in: maDungTichs } }, "TenDungTich").lean(),
        ]);

        // sắp dung tích theo số ml tăng dần (10ml, 30ml, 100ml...)
        dungTich.sort((a, b) => parseInt(a.TenDungTich) - parseInt(b.TenDungTich));

        const notHuong = [...new Set([...dau, ...giua, ...cuoi])].sort((a, b) =>
            a.localeCompare(b, "vi")
        );

        return res.status(200).json({
            data: {
                ThuongHieu: thuongHieu,
                GioiTinh: gioiTinhs.sort(),
                NhomHuong: nhomHuongs.sort(),
                NotHuong: notHuong,
                DungTich: dungTich,
                KhoangGia: {
                    min: spReNhat ? spReNhat.GiaThapNhat : 0,
                    max: spDatNhat ? spDatNhat.GiaCaoNhat : 0,
                },
            },
        });
    } catch (error) {
        console.error("Lỗi khi gọi getFilterOptions", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isObjectId(id)) {
            return res.status(400).json({ message: "Mã sản phẩm không hợp lệ" });
        }

        // sản phẩm đã ẩn coi như không tồn tại với khách
        const sp = await SanPham.findOne({ _id: id, DaAn: false })
            .populate("MaTH", "TenTH MoTa")
            .populate("MaDM", "TenDM")
            .lean();

        if (!sp) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        SanPham.updateOne({ _id: id }, { $inc: { LuotXem: 1 } }, { timestamps: false }).catch((err) =>
            console.error("Không cập nhật được LuotXem", err)
        );

        // khách hàng đã đăng nhập: ghi lại để AI cá nhân hóa gợi ý
        if (req.role === "customer") {
            LuotXemSanPham.updateOne(
                { MaKH: req.user._id, MaSP: id },
                { $inc: { SoLan: 1 }, $set: { LanXemCuoi: new Date() } },
                { upsert: true }
            ).catch((err) => console.error("Không ghi được lượt xem sản phẩm", err));
        }

        const [bienThes, hinhAnhs] = await Promise.all([
            SanPhamDungTich.find({ MaSP: id })
                .populate("MaDungTich", "TenDungTich")
                .sort({ Gia: 1 })
                .lean(),
            HinhAnh.find({ MaSP: id }).sort({ LaAnhChinh: -1, ThuTu: 1 }).lean(),
        ]);

        return res.status(200).json({
            data: {
                _id: sp._id,
                TenSP: sp.TenSP,
                MoTa: sp.MoTa,
                ThongTinChiTiet: sp.ThongTinChiTiet,
                XuatXu: sp.XuatXu,
                GioiTinh: sp.GioiTinh,
                NhomHuong: sp.NhomHuong,
                NotHuong: sp.NotHuong,
                GiaThapNhat: sp.GiaThapNhat,
                GiaCaoNhat: sp.GiaCaoNhat,
                LuotXem: (sp.LuotXem ?? 0) + 1,
                ThuongHieu: sp.MaTH,
                DanhMuc: sp.MaDM,
                BienThe: bienThes.map((b) => ({
                    _id: b._id, // MaSPDungTich dùng cho giỏ hàng / đơn hàng
                    DungTich: b.MaDungTich,
                    Gia: b.Gia,
                    SoLuongCo: b.SoLuongCo,
                    ConHang: b.SoLuongCo > 0,
                })),
                HinhAnh: hinhAnhs.map((h) => ({
                    _id: h._id,
                    DuongDan: h.DuongDan,
                    LaAnhChinh: h.LaAnhChinh,
                })),
                ConHang: bienThes.some((b) => b.SoLuongCo > 0),
            },
        });
    } catch (error) {
        console.error("Lỗi khi gọi getProductById", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
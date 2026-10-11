import SanPham, { boDau, GIOI_TINH, NHOM_HUONG } from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";
import HinhAnh from "../models/HinhAnh.js";
import ThuongHieu from "../models/ThuongHieu.js";
import DanhMucSanPham from "../models/DanhMucSanPham.js";
import DungTich from "../models/DungTich.js";
import GioHang from "../models/GioHang.js";
import YeuThich from "../models/YeuThich.js";
import ChiTietDonHang from "../models/ChiTietDonHang.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;
const TANG_NOT_HUONG = ["Dau", "Giua", "Cuoi"];

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

const kiemTraId = (res, ...ids) => {
    if (!ids.every(isObjectId)) {
        res.status(400).json({ message: "Mã không hợp lệ" });
        return false;
    }
    return true;
};

const checkString = (value, field, max) => {
    if (typeof value !== "string" || !value.trim()) return `${field} không được để trống`;
    if (value.trim().length > max) return `${field} tối đa ${max} ký tự`;
    return null;
};

const checkStringArray = (value, field, max = 50) => {
    if (!Array.isArray(value)) return `${field} phải là mảng`;
    const ok = value.every((v) => typeof v === "string" && v.trim() && v.trim().length <= max);
    return ok ? null : `${field} chứa giá trị không hợp lệ (mỗi giá trị là chuỗi 1-${max} ký tự)`;
};

// ---------- Validate đầu vào ----------

const TEXT_FIELDS = { TenSP: 100, MoTa: 500, ThongTinChiTiet: 2000, XuatXu: 50 };
const REQUIRED_FIELDS = ["TenSP", "MoTa", "ThongTinChiTiet", "XuatXu", "GioiTinh", "MaDM", "MaTH"];

// partial = true: dùng cho cập nhật (chỉ cần gửi trường muốn sửa)
// Chỉ nhận các trường trong danh sách, các trường khác (GiaThapNhat, TenKhongDau...) bị bỏ qua
export const validateProduct = (body, partial) => {
    const data = {};

    if (!partial) {
        const thieu = REQUIRED_FIELDS.filter((f) => body[f] === undefined);
        if (thieu.length) return { error: `Thiếu các trường bắt buộc: ${thieu.join(", ")}` };
    }

    for (const [field, max] of Object.entries(TEXT_FIELDS)) {
        if (body[field] === undefined) continue;
        const e = checkString(body[field], field, max);
        if (e) return { error: e };
        data[field] = body[field].trim();
    }

    if (body.GioiTinh !== undefined) {
        if (!GIOI_TINH.includes(body.GioiTinh)) {
            return { error: `GioiTinh không hợp lệ. Chỉ nhận: ${GIOI_TINH.join(", ")}` };
        }
        data.GioiTinh = body.GioiTinh;
    }

    if (body.NhomHuong !== undefined) {
        const e = checkStringArray(body.NhomHuong, "NhomHuong");
        if (e) return { error: e };
        const ds = [...new Set(body.NhomHuong.map((s) => s.trim().toLowerCase()))];
        if (!ds.every((n) => NHOM_HUONG.includes(n))) {
            return { error: `NhomHuong không hợp lệ. Chỉ nhận: ${NHOM_HUONG.join(", ")}` };
        }
        data.NhomHuong = ds;
    }

    if (body.NotHuong !== undefined) {
        if (!isPlainObject(body.NotHuong)) {
            return { error: "NotHuong phải là object { Dau: [], Giua: [], Cuoi: [] }" };
        }
        data.NotHuong = {};
        for (const tang of TANG_NOT_HUONG) {
            if (body.NotHuong[tang] === undefined) continue;
            const e = checkStringArray(body.NotHuong[tang], `NotHuong.${tang}`);
            if (e) return { error: e };
            data.NotHuong[tang] = body.NotHuong[tang].map((s) => s.trim().toLowerCase());
        }
    }

    for (const field of ["MaDM", "MaTH"]) {
        if (body[field] === undefined) continue;
        if (!isObjectId(body[field])) return { error: `${field} không hợp lệ` };
        data[field] = body[field];
    }

    if (body.DaAn !== undefined) {
        if (typeof body.DaAn !== "boolean") return { error: "DaAn phải là true hoặc false" };
        data.DaAn = body.DaAn;
    }

    if (partial && Object.keys(data).length === 0) {
        return { error: "Không có trường hợp lệ nào để cập nhật" };
    }
    return { data };
};

// kiểm tra 1 biến thể; partial = true khi sửa (không cần MaDungTich)
export const validateBienThe = (item, partial = false) => {
    if (!isPlainObject(item)) return { error: "Biến thể phải là object" };
    const data = {};

    if (!partial) {
        if (!isObjectId(item.MaDungTich)) return { error: "MaDungTich không hợp lệ" };
        data.MaDungTich = item.MaDungTich;
        if (item.SoLuongCo === undefined || item.Gia === undefined) {
            return { error: "Biến thể cần có SoLuongCo và Gia" };
        }
    }
    if (item.SoLuongCo !== undefined) {
        if (!Number.isInteger(item.SoLuongCo) || item.SoLuongCo < 0) {
            return { error: "SoLuongCo phải là số nguyên >= 0" };
        }
        data.SoLuongCo = item.SoLuongCo;
    }
    if (item.Gia !== undefined) {
        if (!Number.isInteger(item.Gia) || item.Gia < 0) {
            return { error: "Gia phải là số nguyên >= 0 (đơn vị VND)" };
        }
        data.Gia = item.Gia;
    }
    if (partial && Object.keys(data).length === 0) {
        return { error: "Cần gửi SoLuongCo hoặc Gia để cập nhật" };
    }
    return { data };
};

const validateHinhAnh = (list) => {
    if (!Array.isArray(list)) return { error: "HinhAnh phải là mảng" };
    const data = [];
    for (const [i, h] of list.entries()) {
        if (!isPlainObject(h)) return { error: "Mỗi hình ảnh phải là object" };
        const e = checkString(h.DuongDan, "HinhAnh.DuongDan", 500);
        if (e) return { error: e };
        data.push({
            DuongDan: h.DuongDan.trim(),
            LoaiHinhAnh: i === 0 ? "Ảnh chính" : "Ảnh phụ",
            LaAnhChinh: i === 0,
            ThuTu: i,
        });
    }
    return { data };
};

// ---------- Hàm dùng chung ----------

// thương hiệu / danh mục phải tồn tại
const kiemTraThamChieu = async (data) => {
    if (data.MaTH && !(await ThuongHieu.exists({ _id: data.MaTH }))) return "Thương hiệu không tồn tại";
    if (data.MaDM && !(await DanhMucSanPham.exists({ _id: data.MaDM }))) return "Danh mục không tồn tại";
    return null;
};

const trungTenSanPham = (tenSP, maTH, boQuaId) =>
    SanPham.exists({
        TenKhongDau: boDau(tenSP),
        MaTH: maTH,
        ...(boQuaId ? { _id: { $ne: boQuaId } } : {}),
    });

// chi tiết sản phẩm cho admin: gồm cả sản phẩm đã ẩn
const layChiTietAdmin = async (id) => {
    const sp = await SanPham.findById(id)
        .populate("MaTH", "TenTH")
        .populate("MaDM", "TenDM")
        .lean();
    if (!sp) return null;

    const [bienThes, hinhAnhs] = await Promise.all([
        SanPhamDungTich.find({ MaSP: id }).populate("MaDungTich", "TenDungTich").sort({ Gia: 1 }).lean(),
        HinhAnh.find({ MaSP: id }).sort({ LaAnhChinh: -1, ThuTu: 1 }).lean(),
    ]);

    const { TenKhongDau, MaTH, MaDM, __v, ...rest } = sp;
    return {
        ...rest,
        ThuongHieu: MaTH,
        DanhMuc: MaDM,
        BienThe: bienThes.map((b) => ({
            _id: b._id,
            DungTich: b.MaDungTich,
            Gia: b.Gia,
            SoLuongCo: b.SoLuongCo,
            ConHang: b.SoLuongCo > 0,
        })),
        HinhAnh: hinhAnhs.map((h) => ({ _id: h._id, DuongDan: h.DuongDan, LaAnhChinh: h.LaAnhChinh, ThuTu: h.ThuTu })),
        TongTon: bienThes.reduce((s, b) => s + b.SoLuongCo, 0),
    };
};

// biến thể đã nằm trong đơn hàng thì không được xóa
const coTrongDonHang = async (bienTheIds) =>
    Boolean(await ChiTietDonHang.exists({ MaSPDungTich: { $in: bienTheIds } }));

// ---------- Handlers: sản phẩm ----------

// GET /api/admin/products?page=1&limit=12&q=dior&trangthai=all|hien|an
export const listAdminProducts = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        let limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        const trangThai = req.query.trangthai ?? "all";
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

        if (page === null) return res.status(400).json({ message: "page phải là số nguyên >= 1" });
        if (limit === null) return res.status(400).json({ message: "limit phải là số nguyên >= 1" });
        if (!["all", "hien", "an"].includes(trangThai)) {
            return res.status(400).json({ message: "trangthai chỉ nhận: all, hien, an" });
        }
        if (q.length > 100) return res.status(400).json({ message: "Từ khóa tìm kiếm tối đa 100 ký tự" });
        limit = Math.min(limit, MAX_LIMIT);

        const filter = {};
        if (trangThai === "hien") filter.DaAn = false;
        if (trangThai === "an") filter.DaAn = true;
        if (q) filter.TenKhongDau = { $regex: escapeRegex(boDau(q)), $options: "i" };

        const [total, sanPhams] = await Promise.all([
            SanPham.countDocuments(filter),
            SanPham.find(filter)
                .sort({ createdAt: -1, _id: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("MaTH", "TenTH")
                .populate("MaDM", "TenDM")
                .lean(),
        ]);

        const ids = sanPhams.map((sp) => sp._id);
        const tonKho = await SanPhamDungTich.aggregate([
            { $match: { MaSP: { $in: ids } } },
            { $group: { _id: "$MaSP", tong: { $sum: "$SoLuongCo" } } },
        ]);
        const tonTheoSP = new Map(tonKho.map((t) => [String(t._id), t.tong]));

        const data = sanPhams.map((sp) => ({
            _id: sp._id,
            TenSP: sp.TenSP,
            GioiTinh: sp.GioiTinh,
            GiaThapNhat: sp.GiaThapNhat,
            GiaCaoNhat: sp.GiaCaoNhat,
            DaAn: sp.DaAn,
            ThuongHieu: sp.MaTH,
            DanhMuc: sp.MaDM,
            TongTon: tonTheoSP.get(String(sp._id)) ?? 0,
        }));

        return res.status(200).json({
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Lỗi khi gọi listAdminProducts", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// GET /api/admin/products/:id
export const getAdminProduct = async (req, res) => {
    try {
        if (!kiemTraId(res, req.params.id)) return;
        const data = await layChiTietAdmin(req.params.id);
        if (!data) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Lỗi khi gọi getAdminProduct", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// POST /api/admin/products
// Body: các trường sản phẩm + (tùy chọn) BienThe: [{ MaDungTich, SoLuongCo, Gia }], HinhAnh: [{ DuongDan }]
export const createProduct = async (req, res) => {
    let spMoi = null;
    try {
        const body = req.body ?? {};

        const { error, data } = validateProduct(body, false);
        if (error) return res.status(400).json({ message: error });

        // biến thể
        const bienTheInput = body.BienThe ?? [];
        if (!Array.isArray(bienTheInput)) {
            return res.status(400).json({ message: "BienThe phải là mảng" });
        }
        const bienThes = [];
        for (const item of bienTheInput) {
            const r = validateBienThe(item, false);
            if (r.error) return res.status(400).json({ message: r.error });
            bienThes.push(r.data);
        }
        const dtIds = bienThes.map((b) => b.MaDungTich);
        if (new Set(dtIds).size !== dtIds.length) {
            return res.status(400).json({ message: "BienThe có dung tích bị trùng" });
        }
        if (dtIds.length && (await DungTich.countDocuments({ _id: { $in: dtIds } })) !== dtIds.length) {
            return res.status(400).json({ message: "Có dung tích không tồn tại" });
        }

        // hình ảnh
        const anh = validateHinhAnh(body.HinhAnh ?? []);
        if (anh.error) return res.status(400).json({ message: anh.error });

        const loiThamChieu = await kiemTraThamChieu(data);
        if (loiThamChieu) return res.status(400).json({ message: loiThamChieu });

        if (await trungTenSanPham(data.TenSP, data.MaTH)) {
            return res.status(409).json({ message: "Thương hiệu này đã có sản phẩm cùng tên" });
        }

        spMoi = await SanPham.create(data);
        for (const b of bienThes) {
            await SanPhamDungTich.create({ MaSP: spMoi._id, ...b }); // hook tự cập nhật khoảng giá
        }
        if (anh.data.length) {
            await HinhAnh.create(anh.data.map((h) => ({ ...h, MaSP: spMoi._id })));
        }

        return res.status(201).json({
            message: "Đã thêm sản phẩm",
            data: await layChiTietAdmin(spMoi._id),
        });
    } catch (error) {
        // lỗi giữa chừng: dọn phần đã tạo để không để lại sản phẩm dở dang
        if (spMoi) {
            await Promise.allSettled([
                SanPhamDungTich.deleteMany({ MaSP: spMoi._id }),
                HinhAnh.deleteMany({ MaSP: spMoi._id }),
                SanPham.deleteOne({ _id: spMoi._id }),
            ]);
        }
        console.error("Lỗi khi gọi createProduct", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// PUT /api/admin/products/:id  (chỉ cần gửi các trường muốn sửa)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        if (!kiemTraId(res, id)) return;

        const sp = await SanPham.findById(id);
        if (!sp) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        const { error, data } = validateProduct(req.body ?? {}, true);
        if (error) return res.status(400).json({ message: error });

        const loiThamChieu = await kiemTraThamChieu(data);
        if (loiThamChieu) return res.status(400).json({ message: loiThamChieu });

        const { NotHuong, ...truongThuong } = data;
        sp.set(truongThuong);
        if (NotHuong) {
            for (const tang of TANG_NOT_HUONG) {
                if (NotHuong[tang]) sp.set(`NotHuong.${tang}`, NotHuong[tang]);
            }
        }

        if (
            (data.TenSP !== undefined || data.MaTH !== undefined) &&
            (await trungTenSanPham(sp.TenSP, sp.MaTH, sp._id))
        ) {
            return res.status(409).json({ message: "Thương hiệu này đã có sản phẩm cùng tên" });
        }

        await sp.save(); // pre('validate') tự sinh lại TenKhongDau
        return res.status(200).json({
            message: "Đã cập nhật sản phẩm",
            data: await layChiTietAdmin(id),
        });
    } catch (error) {
        console.error("Lỗi khi gọi updateProduct", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// PATCH /api/admin/products/:id/an   Body: { "DaAn": true | false }
export const setProductHidden = async (req, res) => {
    try {
        const { id } = req.params;
        if (!kiemTraId(res, id)) return;

        const daAn = req.body?.DaAn;
        if (typeof daAn !== "boolean") {
            return res.status(400).json({ message: "DaAn phải là true hoặc false" });
        }

        const sp = await SanPham.findByIdAndUpdate(id, { DaAn: daAn }, { new: true }).lean();
        if (!sp) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        return res.status(200).json({
            message: daAn ? "Đã ẩn sản phẩm" : "Đã hiện sản phẩm",
            data: { _id: sp._id, TenSP: sp.TenSP, DaAn: sp.DaAn },
        });
    } catch (error) {
        console.error("Lỗi khi gọi setProductHidden", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// DELETE /api/admin/products/:id  (chỉ admin)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        if (!kiemTraId(res, id)) return;

        const sp = await SanPham.findById(id, "_id").lean();
        if (!sp) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        const bienTheIds = await SanPhamDungTich.distinct("_id", { MaSP: id });
        if (bienTheIds.length && (await coTrongDonHang(bienTheIds))) {
            return res.status(409).json({
                message: "Sản phẩm đã có trong đơn hàng nên không thể xóa. Hãy ẩn sản phẩm thay vì xóa.",
            });
        }

        await Promise.all([
            GioHang.deleteMany({ MaSPDungTich: { $in: bienTheIds } }),
            YeuThich.deleteMany({ MaSP: id }),
            HinhAnh.deleteMany({ MaSP: id }),
            SanPhamDungTich.deleteMany({ MaSP: id }),
        ]);
        await SanPham.deleteOne({ _id: id });

        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi khi gọi deleteProduct", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- Handlers: biến thể dung tích ----------

// POST /api/admin/products/:id/bienthe   Body: { MaDungTich, SoLuongCo, Gia }
export const addVariant = async (req, res) => {
    try {
        const { id } = req.params;
        if (!kiemTraId(res, id)) return;

        const { error, data } = validateBienThe(req.body ?? {}, false);
        if (error) return res.status(400).json({ message: error });

        if (!(await SanPham.exists({ _id: id }))) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        if (!(await DungTich.exists({ _id: data.MaDungTich }))) {
            return res.status(400).json({ message: "Dung tích không tồn tại" });
        }

        try {
            await SanPhamDungTich.create({ MaSP: id, ...data });
        } catch (e) {
            if (e.code === 11000) {
                return res.status(409).json({ message: "Sản phẩm đã có dung tích này" });
            }
            throw e;
        }

        return res.status(201).json({
            message: "Đã thêm biến thể",
            data: await layChiTietAdmin(id),
        });
    } catch (error) {
        console.error("Lỗi khi gọi addVariant", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// PUT /api/admin/products/:id/bienthe/:bid   Body: { SoLuongCo?, Gia? }
export const updateVariant = async (req, res) => {
    try {
        const { id, bid } = req.params;
        if (!kiemTraId(res, id, bid)) return;

        const { error, data } = validateBienThe(req.body ?? {}, true);
        if (error) return res.status(400).json({ message: error });

        // findOneAndUpdate -> hook tự cập nhật GiaThapNhat / GiaCaoNhat
        const bt = await SanPhamDungTich.findOneAndUpdate(
            { _id: bid, MaSP: id },
            { $set: data },
            { new: true, runValidators: true }
        );
        if (!bt) return res.status(404).json({ message: "Không tìm thấy biến thể của sản phẩm này" });

        return res.status(200).json({
            message: "Đã cập nhật biến thể",
            data: await layChiTietAdmin(id),
        });
    } catch (error) {
        console.error("Lỗi khi gọi updateVariant", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// DELETE /api/admin/products/:id/bienthe/:bid  (chỉ admin)
export const deleteVariant = async (req, res) => {
    try {
        const { id, bid } = req.params;
        if (!kiemTraId(res, id, bid)) return;

        if (!(await SanPhamDungTich.exists({ _id: bid, MaSP: id }))) {
            return res.status(404).json({ message: "Không tìm thấy biến thể của sản phẩm này" });
        }
        if (await coTrongDonHang([bid])) {
            return res.status(409).json({
                message: "Biến thể đã có trong đơn hàng nên không thể xóa. Hãy đặt SoLuongCo = 0 để ngừng bán.",
            });
        }

        await GioHang.deleteMany({ MaSPDungTich: bid });
        await SanPhamDungTich.findOneAndDelete({ _id: bid, MaSP: id }); // hook cập nhật khoảng giá

        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi khi gọi deleteVariant", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
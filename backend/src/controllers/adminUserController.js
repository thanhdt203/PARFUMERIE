import crypto from "crypto";
import bcrypt from "bcrypt";
import KhachHang from "../models/KhachHang.js";
import NhanVien from "../models/NhanVien.js";
import SoDiaChi from "../models/SoDiaChi.js";
import Session from "../models/Session.js";
import { sendMail, MailNotConfiguredError } from "../libs/mailer.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
const VAI_TRO = ["customer", "staff", "admin"];
const TRANG_THAI = ["hoatdong", "khoa"];

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, defaultValue) => {
    if (value === undefined || value === "") return defaultValue;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return n >= 1 ? n : null;
};

// Tìm người dùng ở cả hai collection (ObjectId không trùng giữa 2 collection)
const findUser = async (id) => {
    const khach = await KhachHang.findById(id);
    if (khach) return { doc: khach, loai: "customer" };
    const nv = await NhanVien.findById(id);
    if (nv) return { doc: nv, loai: nv.VaiTro };
    return null;
};

const countActiveAdmins = () => NhanVien.countDocuments({ VaiTro: "admin", BiKhoa: { $ne: true } });

// Mật khẩu ngẫu nhiên 12 ký tự, đảm bảo có chữ hoa, chữ thường và số, bỏ ký tự dễ nhầm (0/O, 1/l/I)
const taoMatKhauMoi = () => {
    const hoa = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const thuong = "abcdefghijkmnpqrstuvwxyz";
    const so = "23456789";
    const tatCa = hoa + thuong + so;
    const pick = (chars) => chars[crypto.randomInt(chars.length)];
    const kyTu = [pick(hoa), pick(thuong), pick(so)];
    while (kyTu.length < 12) kyTu.push(pick(tatCa));
    for (let i = kyTu.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [kyTu[i], kyTu[j]] = [kyTu[j], kyTu[i]];
    }
    return kyTu.join("");
};

// ---------- GET /api/admin/users?page=&limit=&q=&vaitro=&trangthai= ----------
// Gộp khách hàng + nhân viên thành một danh sách. Không bao giờ trả mật khẩu.
export const listUsers = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limitRaw = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        if (page === null || limitRaw === null) {
            return res.status(400).json({ message: "page và limit phải là số nguyên dương" });
        }
        const limit = Math.min(limitRaw, MAX_LIMIT);

        const { vaitro, trangthai } = req.query;
        if (vaitro && !VAI_TRO.includes(vaitro)) {
            return res.status(400).json({ message: `vaitro không hợp lệ. Chỉ nhận: ${VAI_TRO.join(", ")}` });
        }
        if (trangthai && !TRANG_THAI.includes(trangthai)) {
            return res.status(400).json({ message: `trangthai không hợp lệ. Chỉ nhận: ${TRANG_THAI.join(", ")}` });
        }

        const match = {};
        if (vaitro) match.VaiTro = vaitro;
        if (trangthai) match.BiKhoa = trangthai === "khoa";
        const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 50) : "";
        if (q) {
            const regex = new RegExp(escapeRegex(q), "i");
            match.$or = [{ HoTen: regex }, { Email: regex }, { SoDienThoai: regex }, { TenDangNhap: regex }];
        }

        // đưa 2 collection về cùng một dạng rồi mới lọc / sắp xếp / phân trang
        const [kq] = await KhachHang.aggregate([
            {
                $project: {
                    HoTen: { $concat: ["$Ho", " ", "$Ten"] },
                    Email: 1,
                    SoDienThoai: 1,
                    NgaySinh: { $ifNull: ["$NgaySinh", null] },
                    DiaChi: { $literal: null },
                    VaiTro: { $literal: "customer" },
                    BiKhoa: { $ifNull: ["$BiKhoa", false] },
                    createdAt: 1
                }
            },
            {
                $unionWith: {
                    coll: NhanVien.collection.name,
                    pipeline: [
                        {
                            $project: {
                                HoTen: "$HoTenNV",
                                Email: { $ifNull: ["$Email", null] },
                                TenDangNhap: 1,
                                SoDienThoai: 1,
                                NgaySinh: { $ifNull: ["$NgaySinh", null] },
                                DiaChi: { $ifNull: ["$DiaChi", null] },
                                VaiTro: 1,
                                BiKhoa: { $ifNull: ["$BiKhoa", false] },
                                createdAt: 1
                            }
                        }
                    ]
                }
            },
            { $match: match },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $facet: {
                    rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                    total: [{ $count: "n" }]
                }
            }
        ]);

        const rows = kq?.rows ?? [];
        const total = kq?.total[0]?.n ?? 0;

        // khách hàng: lấy địa chỉ mới nhất trong sổ địa chỉ
        const khachIds = rows.filter((r) => r.VaiTro === "customer").map((r) => r._id);
        const diaChiMap = new Map();
        if (khachIds.length > 0) {
            const diaChi = await SoDiaChi.find({ MaKH: { $in: khachIds } })
                .sort({ createdAt: -1 })
                .select("MaKH DiaChi")
                .lean();
            for (const d of diaChi) {
                const key = String(d.MaKH);
                if (!diaChiMap.has(key)) diaChiMap.set(key, d.DiaChi);
            }
        }

        const data = rows.map((r) => ({
            _id: r._id,
            HoTen: r.HoTen,
            Email: r.Email ?? null,
            SoDienThoai: r.SoDienThoai,
            NgaySinh: r.NgaySinh ?? null,
            DiaChi: r.VaiTro === "customer" ? (diaChiMap.get(String(r._id)) ?? null) : (r.DiaChi ?? null),
            VaiTro: r.VaiTro,
            BiKhoa: r.BiKhoa,
            createdAt: r.createdAt
        }));

        return res.status(200).json({
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Lỗi khi gọi listUsers", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- PATCH /api/admin/users/:id/role  { VaiTro: "staff" | "admin" } ----------
// Chỉ đổi qua lại giữa nhân viên (Quản lý) và admin. Khách hàng nằm ở collection khác nên không đổi sang nhân viên ở đây.
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const { VaiTro } = req.body ?? {};
        if (!["staff", "admin"].includes(VaiTro)) {
            return res.status(400).json({ message: "VaiTro chỉ nhận: staff, admin" });
        }

        const found = await findUser(id);
        if (!found) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        if (found.loai === "customer") {
            return res.status(400).json({ message: "Không thể đổi quyền của khách hàng" });
        }
        if (String(found.doc._id) === String(req.user._id)) {
            return res.status(400).json({ message: "Bạn không thể tự đổi quyền của chính mình" });
        }
        if (found.doc.VaiTro === VaiTro) {
            return res.status(200).json({ message: "Quyền không thay đổi", data: { _id: found.doc._id, VaiTro } });
        }

        // đang hạ một admin còn hoạt động xuống: phải còn ít nhất một admin khác
        if (found.doc.VaiTro === "admin" && !found.doc.BiKhoa && (await countActiveAdmins()) <= 1) {
            return res.status(409).json({ message: "Phải còn ít nhất một quản trị viên đang hoạt động" });
        }

        found.doc.VaiTro = VaiTro;
        await found.doc.save();

        // đăng xuất các phiên cũ để quyền mới có hiệu lực ngay (token cũ mang role cũ)
        await Session.deleteMany({ userId: found.doc._id });

        return res.status(200).json({ message: "Cập nhật quyền thành công", data: { _id: found.doc._id, VaiTro } });
    } catch (error) {
        console.error("Lỗi khi gọi updateUserRole", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- PATCH /api/admin/users/:id/status  { BiKhoa: boolean } ----------
export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const { BiKhoa } = req.body ?? {};
        if (typeof BiKhoa !== "boolean") {
            return res.status(400).json({ message: "BiKhoa phải là true hoặc false" });
        }

        const found = await findUser(id);
        if (!found) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        if (BiKhoa) {
            if (String(found.doc._id) === String(req.user._id)) {
                return res.status(400).json({ message: "Bạn không thể tự khóa tài khoản của chính mình" });
            }
            if (found.loai === "admin" && !found.doc.BiKhoa && (await countActiveAdmins()) <= 1) {
                return res.status(409).json({ message: "Phải còn ít nhất một quản trị viên đang hoạt động" });
            }
        }

        found.doc.BiKhoa = BiKhoa;
        await found.doc.save();

        // khóa thì thu hồi mọi phiên đăng nhập, refresh token cũ không dùng được nữa
        if (BiKhoa) await Session.deleteMany({ userId: found.doc._id });

        return res.status(200).json({
            message: BiKhoa ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
            data: { _id: found.doc._id, BiKhoa }
        });
    } catch (error) {
        console.error("Lỗi khi gọi updateUserStatus", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- POST /api/admin/users/:id/reset-password ----------
// Tạo mật khẩu mới, gửi tới email người dùng. Admin không bao giờ thấy mật khẩu mới.
export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

        const found = await findUser(id);
        if (!found) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        const email = found.doc.Email;
        if (!email) {
            return res.status(400).json({ message: "Người dùng này chưa có email nên không thể gửi mật khẩu mới" });
        }

        const matKhauCu = found.doc.MatKhau;
        const matKhauMoi = taoMatKhauMoi();
        found.doc.MatKhau = await bcrypt.hash(matKhauMoi, 10);
        await found.doc.save();

        const ten = found.loai === "customer" ? `${found.doc.Ho} ${found.doc.Ten}` : found.doc.HoTenNV;
        try {
            await sendMail({
                to: email,
                subject: "Parfumerie - Mật khẩu mới của bạn",
                text:
                    `Xin chào ${ten},\n\n` +
                    `Quản trị viên vừa đặt lại mật khẩu cho tài khoản của bạn.\n` +
                    `Mật khẩu mới: ${matKhauMoi}\n\n` +
                    `Hãy đăng nhập và đổi mật khẩu ngay khi có thể. ` +
                    `Nếu bạn không yêu cầu việc này, vui lòng liên hệ cửa hàng.`
            });
        } catch (mailError) {
            // gửi mail lỗi: trả mật khẩu cũ lại để người dùng không bị khóa ngoài tài khoản
            found.doc.MatKhau = matKhauCu;
            await found.doc.save();
            console.error("Lỗi gửi email reset mật khẩu", mailError);
            if (mailError instanceof MailNotConfiguredError) {
                return res.status(503).json({ message: "Hệ thống chưa cấu hình email (SMTP) nên chưa thể reset mật khẩu" });
            }
            return res.status(502).json({ message: "Không gửi được email. Mật khẩu cũ vẫn được giữ nguyên." });
        }

        // đăng xuất mọi thiết bị đang dùng mật khẩu cũ
        await Session.deleteMany({ userId: found.doc._id });

        return res.status(200).json({ message: `Đã gửi mật khẩu mới tới ${email}` });
    } catch (error) {
        console.error("Lỗi khi gọi resetUserPassword", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

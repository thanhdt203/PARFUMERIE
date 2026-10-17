import DonHang from "../models/DonHang.js";
import ChiTietDonHang from "../models/ChiTietDonHang.js";
import GioHang from "../models/GioHang.js";
import SanPham from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";
import PhuongThucThanhToan from "../models/PhuongThucThanhToan.js";
import HinhAnh from "../models/HinhAnh.js";
import { kiemTraVoucherChoDon, demLuotDung, VoucherError } from "../libs/voucherApply.js";
// import để Mongoose đăng ký đủ model cho populate
import "../models/DungTich.js";
import "../models/ThuongHieu.js";
import "../models/Voucher.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

// Đặt hàng tối đa 1 lần tại một thời điểm cho mỗi khách (chặn bấm đúp / mở 2 tab).
// Chỉ có tác dụng trong 1 tiến trình; nếu chạy nhiều instance thì việc trừ kho
// bằng điều kiện SoLuongCo >= n bên dưới vẫn đảm bảo không bán lố.
const dangDatHang = new Set();

// Lỗi nghiệp vụ biết trước, trả thẳng message cho khách
class DatHangError extends Error {
    constructor(message, status = 409) {
        super(message);
        this.status = status;
    }
}

// ---------- Kiểm tra dữ liệu người nhận ----------

const SDT_REGEX = /^(?:\+84|0)\d{9,10}$/;

const kiemTraNguoiNhan = (body) => {
    const chuoi = (v) => (typeof v === "string" ? v.trim() : "");
    const HoTenNguoiNhan = chuoi(body?.HoTenNguoiNhan);
    const SoDienThoaiNguoiNhan = chuoi(body?.SoDienThoaiNguoiNhan).replace(/[\s.]/g, "");
    const DiaChiNguoiNhan = chuoi(body?.DiaChiNguoiNhan);
    const GhiChu = chuoi(body?.GhiChu);

    if (HoTenNguoiNhan.length < 2 || HoTenNguoiNhan.length > 100) {
        return { loi: "Họ tên người nhận phải từ 2 đến 100 ký tự" };
    }
    if (!SDT_REGEX.test(SoDienThoaiNguoiNhan)) {
        return { loi: "Số điện thoại người nhận không hợp lệ" };
    }
    if (DiaChiNguoiNhan.length < 5 || DiaChiNguoiNhan.length > 150) {
        return { loi: "Địa chỉ nhận hàng phải từ 5 đến 150 ký tự" };
    }
    if (GhiChu.length > 150) {
        return { loi: "Ghi chú tối đa 150 ký tự" };
    }
    return { HoTenNguoiNhan, SoDienThoaiNguoiNhan, DiaChiNguoiNhan, GhiChu };
};

// Người mua (HoTenKH / SoDienThoai / DiaChi của đơn). Form gửi kèm HoTenKH, SoDienThoaiKH, DiaChiKH;
// không gửi thì lấy họ tên + số điện thoại của tài khoản và địa chỉ nhận hàng (như bản đầu tiên).
const kiemTraNguoiMua = (body, nguoiNhan, khach) => {
    const chuoi = (v) => (typeof v === "string" ? v.trim() : "");
    const coGui = ["HoTenKH", "SoDienThoaiKH", "DiaChiKH"].some((k) => body?.[k] !== undefined);
    if (!coGui) {
        return {
            HoTenKH: `${khach.Ho} ${khach.Ten}`.trim().slice(0, 50),
            SoDienThoai: khach.SoDienThoai,
            DiaChi: nguoiNhan.DiaChiNguoiNhan
        };
    }

    const HoTenKH = chuoi(body.HoTenKH);
    const SoDienThoai = chuoi(body.SoDienThoaiKH).replace(/[\s.]/g, "");
    const DiaChi = chuoi(body.DiaChiKH);

    if (HoTenKH.length < 2 || HoTenKH.length > 50) {
        return { loi: "Họ tên người mua phải từ 2 đến 50 ký tự" };
    }
    if (!SDT_REGEX.test(SoDienThoai)) {
        return { loi: "Số điện thoại người mua không hợp lệ" };
    }
    if (DiaChi.length < 5 || DiaChi.length > 150) {
        return { loi: "Địa chỉ người mua phải từ 5 đến 150 ký tự" };
    }
    return { HoTenKH, SoDienThoai, DiaChi };
};

// ---------- Kho ----------

// Cộng lại số lượng đã trừ: dùng khi đặt hàng thất bại giữa chừng hoặc khi khách hủy đơn
const traLaiKho = async (dong) => {
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

// ---------- Dựng chi tiết đơn để trả về ----------

// Trả về Map: _id đơn -> các dòng chi tiết (kèm tên sản phẩm, dung tích, ảnh)
const layChiTietTheoDon = async (maDHs) => {
    const ketQua = new Map(maDHs.map((id) => [String(id), []]));
    if (!maDHs.length) return ketQua;

    const dong = await ChiTietDonHang.find({ MaDH: { $in: maDHs } })
        .sort({ createdAt: 1, _id: 1 })
        .populate({
            path: "MaSPDungTich",
            select: "MaSP MaDungTich",
            populate: [
                { path: "MaDungTich", select: "TenDungTich" },
                { path: "MaSP", select: "TenSP MaTH", populate: { path: "MaTH", select: "TenTH" } }
            ]
        })
        .lean();

    const spIds = [
        ...new Set(dong.map((d) => d.MaSPDungTich?.MaSP?._id).filter(Boolean).map(String))
    ];
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

    for (const d of dong) {
        const bienThe = d.MaSPDungTich;
        const sp = bienThe?.MaSP;
        ketQua.get(String(d.MaDH))?.push({
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
        });
    }
    return ketQua;
};

const dinhDangDon = (don, chiTiet) => {
    // TongTien là số khách phải trả (đã trừ voucher); tiền giảm = tiền hàng - TongTien
    const tamTinh = chiTiet.reduce((sum, d) => sum + d.ThanhTien, 0);
    return {
        _id: don._id,
        NgayDat: don.NgayDat,
        TamTinh: tamTinh,
        TienGiam: don.MaVoucher ? Math.max(tamTinh - don.TongTien, 0) : 0,
        Voucher: don.MaVoucher ? { _id: don.MaVoucher._id, MaCode: don.MaVoucher.MaCode ?? null } : null,
        TongTien: don.TongTien,
        TrangThai: don.TrangThai,
        GhiChu: don.GhiChu ?? "",
        HoTenNguoiNhan: don.HoTenNguoiNhan,
        SoDienThoaiNguoiNhan: don.SoDienThoaiNguoiNhan,
        DiaChiNguoiNhan: don.DiaChiNguoiNhan,
        PhuongThucThanhToan: don.MaPTTT ? { _id: don.MaPTTT._id, TenPTTT: don.MaPTTT.TenPTTT } : null,
        ChiTiet: chiTiet
    };
};

// ---------- GET /api/me/orders/payment-methods ----------

export const getPaymentMethods = async (req, res) => {
    try {
        const ds = await PhuongThucThanhToan.find().sort({ createdAt: 1, _id: 1 }).select("TenPTTT").lean();
        return res.status(200).json({ data: ds });
    } catch (error) {
        console.error("Lỗi khi gọi getPaymentMethods", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- POST /api/me/orders ----------
// body: { HoTenNguoiNhan, SoDienThoaiNguoiNhan, DiaChiNguoiNhan, MaPTTT, GhiChu?, MaCode? (mã giảm giá),
//         HoTenKH?, SoDienThoaiKH?, DiaChiKH? }  (3 trường sau: thông tin người mua, bỏ trống thì lấy theo tài khoản)
// Đơn được tạo từ GIỎ HÀNG trên server; giá lấy từ CSDL, không tin giá do client gửi.
// Trình tự: kiểm tra -> trừ kho từng biến thể (có điều kiện đủ hàng) -> tạo đơn + chi tiết -> xóa giỏ.
// Bước nào lỗi thì trả lại kho đã trừ và xóa đơn dở, giỏ hàng giữ nguyên.
export const createOrder = async (req, res) => {
    const maKH = req.user._id;
    const khoa = String(maKH);

    if (dangDatHang.has(khoa)) {
        return res.status(409).json({ message: "Đơn hàng của bạn đang được xử lý, vui lòng đợi giây lát" });
    }
    dangDatHang.add(khoa);

    const daTru = []; // các dòng đã trừ kho, để hoàn lại khi lỗi
    let don = null;

    try {
        const nguoiNhan = kiemTraNguoiNhan(req.body);
        if (nguoiNhan.loi) return res.status(400).json({ message: nguoiNhan.loi });

        const nguoiMua = kiemTraNguoiMua(req.body, nguoiNhan, req.user);
        if (nguoiMua.loi) return res.status(400).json({ message: nguoiMua.loi });

        const { MaPTTT } = req.body ?? {};
        if (!isObjectId(MaPTTT)) {
            return res.status(400).json({ message: "Vui lòng chọn phương thức thanh toán" });
        }
        const pttt = await PhuongThucThanhToan.findById(MaPTTT).select("_id").lean();
        if (!pttt) return res.status(400).json({ message: "Phương thức thanh toán không tồn tại" });

        // --- đọc giỏ và kiểm tra từng dòng ---
        const dongGio = await GioHang.find({ MaKH: maKH }).sort({ createdAt: 1 }).lean();
        if (!dongGio.length) throw new DatHangError("Giỏ hàng đang trống", 400);

        const bienThes = await SanPhamDungTich.find({ _id: { $in: dongGio.map((l) => l.MaSPDungTich) } })
            .populate("MaDungTich", "TenDungTich")
            .lean();
        const bienTheMap = new Map(bienThes.map((b) => [String(b._id), b]));
        const sanPhams = await SanPham.find({ _id: { $in: bienThes.map((b) => b.MaSP) }, DaAn: false })
            .select("TenSP")
            .lean();
        const sanPhamMap = new Map(sanPhams.map((s) => [String(s._id), s]));

        const chiTiet = [];
        const vanDe = [];
        for (const line of dongGio) {
            const bt = bienTheMap.get(String(line.MaSPDungTich));
            const sp = bt && sanPhamMap.get(String(bt.MaSP));
            if (!bt || !sp) {
                vanDe.push("Có sản phẩm trong giỏ không còn được bán, hãy xóa khỏi giỏ");
                continue;
            }
            const ten = `${sp.TenSP} (${bt.MaDungTich?.TenDungTich ?? ""})`;
            if (bt.SoLuongCo < line.SoLuongChonMua) {
                vanDe.push(
                    bt.SoLuongCo > 0
                        ? `${ten} chỉ còn ${bt.SoLuongCo} sản phẩm`
                        : `${ten} đã hết hàng`
                );
                continue;
            }
            chiTiet.push({
                MaSPDungTich: bt._id,
                SoLuongMua: line.SoLuongChonMua,
                DonGia: bt.Gia,
                Ten: ten
            });
        }
        if (vanDe.length) throw new DatHangError([...new Set(vanDe)].join("; "));

        const tamTinh = chiTiet.reduce((sum, d) => sum + d.DonGia * d.SoLuongMua, 0);

        // --- mã giảm giá (nếu có): kiểm tra lại trên server, không tin số tiền giảm do client gửi ---
        let voucher = null;
        let tienGiam = 0;
        const maCode = typeof req.body?.MaCode === "string" ? req.body.MaCode.trim() : "";
        if (maCode) {
            try {
                ({ voucher, tienGiam } = await kiemTraVoucherChoDon(maCode, tamTinh));
            } catch (e) {
                if (e instanceof VoucherError) throw new DatHangError(e.message, e.status);
                throw e;
            }
        }
        const tongTien = tamTinh - tienGiam;

        // --- trừ kho: chỉ trừ khi còn đủ, thiếu thì dừng và hoàn lại những dòng đã trừ ---
        for (const d of chiTiet) {
            const kq = await SanPhamDungTich.updateOne(
                { _id: d.MaSPDungTich, SoLuongCo: { $gte: d.SoLuongMua } },
                { $inc: { SoLuongCo: -d.SoLuongMua } }
            );
            if (kq.modifiedCount !== 1) {
                throw new DatHangError(`${d.Ten} vừa hết hàng hoặc không đủ số lượng, hãy kiểm tra lại giỏ`);
            }
            daTru.push(d);
        }

        // --- tạo đơn + chi tiết ---
        const khach = req.user;
        don = await DonHang.create({
            NgayDat: new Date(),
            TongTien: tongTien,
            MaPTTT,
            GhiChu: nguoiNhan.GhiChu,
            HoTenKH: nguoiMua.HoTenKH,
            Email: khach.Email,
            SoDienThoai: nguoiMua.SoDienThoai,
            DiaChi: nguoiMua.DiaChi,
            HoTenNguoiNhan: nguoiNhan.HoTenNguoiNhan,
            SoDienThoaiNguoiNhan: nguoiNhan.SoDienThoaiNguoiNhan,
            DiaChiNguoiNhan: nguoiNhan.DiaChiNguoiNhan,
            MaVoucher: voucher?._id ?? null,
            MaKH: maKH
        });

        // chống dùng lố số lượt khi nhiều khách đặt cùng lúc: đếm lại sau khi đơn đã lưu (đã gồm đơn này),
        // quá hạn mức thì ném lỗi -> khối catch bên dưới xóa đơn và trả lại kho
        if (voucher && voucher.SoLuong != null) {
            const daDung = await demLuotDung(voucher._id);
            if (daDung > voucher.SoLuong) {
                throw new DatHangError("Mã giảm giá vừa hết lượt sử dụng, hãy bỏ mã rồi đặt lại");
            }
        }

        await ChiTietDonHang.insertMany(
            chiTiet.map((d) => ({
                MaDH: don._id,
                MaSPDungTich: d.MaSPDungTich,
                SoLuongMua: d.SoLuongMua,
                DonGia: d.DonGia
            }))
        );

        // --- đơn đã lưu xong: dọn giỏ (lỗi ở đây không làm hỏng đơn) ---
        try {
            await GioHang.deleteMany({ _id: { $in: dongGio.map((l) => l._id) }, MaKH: maKH });
        } catch (e) {
            console.error("Đã tạo đơn nhưng chưa xóa được giỏ hàng", e);
        }

        return res.status(201).json({
            message: "Đặt hàng thành công",
            data: { _id: don._id, TongTien: don.TongTien, TienGiam: tienGiam, TrangThai: don.TrangThai }
        });
    } catch (error) {
        // dọn dở dang: xóa đơn (nếu đã tạo) và trả lại kho đã trừ
        try {
            if (don) {
                await ChiTietDonHang.deleteMany({ MaDH: don._id });
                await DonHang.deleteOne({ _id: don._id });
            }
            await traLaiKho(daTru.map((d) => ({ MaSPDungTich: d.MaSPDungTich, SoLuongMua: d.SoLuongMua })));
        } catch (e) {
            console.error("Không hoàn tác được sau khi đặt hàng lỗi, cần kiểm tra kho thủ công", e);
        }

        if (error instanceof DatHangError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error("Lỗi khi gọi createOrder", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    } finally {
        dangDatHang.delete(khoa);
    }
};

// ---------- GET /api/me/orders?page=1&limit=10 ----------

export const listMyOrders = async (req, res) => {
    try {
        const page = /^\d+$/.test(String(req.query.page ?? "1")) ? Math.max(Number(req.query.page ?? 1), 1) : 1;
        const limitRaw = /^\d+$/.test(String(req.query.limit ?? "")) ? Number(req.query.limit) : DEFAULT_LIMIT;
        const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);

        const filter = { MaKH: req.user._id };
        const [dons, total] = await Promise.all([
            DonHang.find(filter)
                .sort({ NgayDat: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("MaPTTT", "TenPTTT")
                .populate("MaVoucher", "MaCode")
                .lean(),
            DonHang.countDocuments(filter)
        ]);

        const chiTietMap = await layChiTietTheoDon(dons.map((d) => d._id));

        return res.status(200).json({
            data: dons.map((d) => dinhDangDon(d, chiTietMap.get(String(d._id)) ?? [])),
            pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) }
        });
    } catch (error) {
        console.error("Lỗi khi gọi listMyOrders", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- GET /api/me/orders/:id ----------

export const getMyOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã đơn hàng không hợp lệ" });

        // lọc theo MaKH để khách không xem được đơn của người khác
        const don = await DonHang.findOne({ _id: id, MaKH: req.user._id }).populate("MaPTTT", "TenPTTT").populate("MaVoucher", "MaCode").lean();
        if (!don) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

        const chiTietMap = await layChiTietTheoDon([don._id]);
        return res.status(200).json({ data: dinhDangDon(don, chiTietMap.get(String(don._id)) ?? []) });
    } catch (error) {
        console.error("Lỗi khi gọi getMyOrder", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- PATCH /api/me/orders/:id/huy ----------
// Khách chỉ tự hủy được đơn còn "Chờ xác nhận"; hủy xong cộng lại kho.
export const cancelMyOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ message: "Mã đơn hàng không hợp lệ" });

        // đổi trạng thái có điều kiện: 2 yêu cầu cùng lúc thì chỉ 1 yêu cầu thành công (không hoàn kho 2 lần)
        const daHuy = await DonHang.findOneAndUpdate(
            { _id: id, MaKH: req.user._id, TrangThai: "Chờ xác nhận" },
            { $set: { TrangThai: "Đã hủy" } },
            { new: true }
        )
            .select("_id")
            .lean();

        if (!daHuy) {
            const tonTai = await DonHang.exists({ _id: id, MaKH: req.user._id });
            if (!tonTai) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
            return res.status(409).json({ message: "Chỉ hủy được đơn đang ở trạng thái Chờ xác nhận" });
        }

        try {
            const dong = await ChiTietDonHang.find({ MaDH: id }).select("MaSPDungTich SoLuongMua").lean();
            await traLaiKho(dong);
        } catch (e) {
            // hoàn kho lỗi thì trả đơn về trạng thái cũ, tránh đơn đã hủy mà kho chưa được cộng
            await DonHang.updateOne({ _id: id, TrangThai: "Đã hủy" }, { $set: { TrangThai: "Chờ xác nhận" } });
            throw e;
        }

        return res.status(200).json({ message: "Đã hủy đơn hàng" });
    } catch (error) {
        console.error("Lỗi khi gọi cancelMyOrder", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// ---------- POST /api/me/orders/voucher/preview ----------
// body: { MaCode }. Tính tiền giảm trên GIỎ HÀNG hiện tại của khách (không tạo đơn, không giữ lượt).
// Khi đặt hàng, createOrder kiểm tra lại từ đầu nên kết quả ở đây chỉ để hiển thị.
export const previewVoucher = async (req, res) => {
    try {
        const dongGio = await GioHang.find({ MaKH: req.user._id }).lean();
        if (!dongGio.length) return res.status(400).json({ message: "Giỏ hàng đang trống" });

        const bienThes = await SanPhamDungTich.find({ _id: { $in: dongGio.map((l) => l.MaSPDungTich) } })
            .select("MaSP Gia")
            .lean();
        const sanPhams = await SanPham.find({ _id: { $in: bienThes.map((b) => b.MaSP) }, DaAn: false })
            .select("_id")
            .lean();
        const spHienThi = new Set(sanPhams.map((s) => String(s._id)));
        const giaMap = new Map(bienThes.filter((b) => spHienThi.has(String(b.MaSP))).map((b) => [String(b._id), b.Gia]));
        const tamTinh = dongGio.reduce(
            (sum, l) => sum + (giaMap.get(String(l.MaSPDungTich)) ?? 0) * l.SoLuongChonMua,
            0
        );

        const { voucher, tienGiam } = await kiemTraVoucherChoDon(req.body?.MaCode, tamTinh);
        return res.status(200).json({
            data: {
                MaCode: voucher.MaCode,
                LoaiGiam: voucher.LoaiGiam ?? "tien",
                GiaTri: voucher.GiaTri,
                TamTinh: tamTinh,
                TienGiam: tienGiam,
                TongTien: tamTinh - tienGiam
            }
        });
    } catch (error) {
        if (error instanceof VoucherError) return res.status(error.status).json({ message: error.message });
        console.error("Lỗi khi gọi previewVoucher", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

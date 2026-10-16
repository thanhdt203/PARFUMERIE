import mongoose from "mongoose";
import GioHang from "../models/GioHang.js";
import SanPham from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";
import HinhAnh from "../models/HinhAnh.js";

// Mỗi dòng giỏ tối đa 10 chai (khớp MAX_QTY ở trang chi tiết sản phẩm)
const MAX_QTY = 10;

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;

// Dựng giỏ hàng đầy đủ thông tin hiển thị cho 1 khách
// (dòng nào mà sản phẩm đã bị xóa/ẩn thì bỏ khỏi giỏ luôn)
async function buildCart(maKH) {
    const lines = await GioHang.find({ MaKH: maKH }).sort({ createdAt: 1 }).lean();

    const bienThes = await SanPhamDungTich.find({ _id: { $in: lines.map((l) => l.MaSPDungTich) } })
        .populate("MaDungTich", "TenDungTich")
        .lean();
    const bienTheMap = new Map(bienThes.map((b) => [String(b._id), b]));

    const sanPhams = await SanPham.find({
        _id: { $in: bienThes.map((b) => b.MaSP) },
        DaAn: false,
    })
        .populate("MaTH", "TenTH")
        .lean();
    const sanPhamMap = new Map(sanPhams.map((s) => [String(s._id), s]));

    const hinhAnhs = await HinhAnh.find({ MaSP: { $in: sanPhams.map((s) => s._id) } })
        .sort({ LaAnhChinh: -1, ThuTu: 1 })
        .lean();
    const anhChinh = new Map();
    for (const ha of hinhAnhs) {
        const key = String(ha.MaSP);
        if (!anhChinh.has(key)) anhChinh.set(key, ha.DuongDan);
    }

    const items = [];
    const orphanIds = [];
    for (const line of lines) {
        const bt = bienTheMap.get(String(line.MaSPDungTich));
        const sp = bt && sanPhamMap.get(String(bt.MaSP));
        if (!bt || !sp) {
            orphanIds.push(line._id);
            continue;
        }
        items.push({
            _id: line._id,
            MaSPDungTich: bt._id,
            MaSP: sp._id,
            TenSP: sp.TenSP,
            TenThuongHieu: sp.MaTH?.TenTH ?? "",
            GioiTinh: sp.GioiTinh,
            XuatXu: sp.XuatXu,
            TenDungTich: bt.MaDungTich?.TenDungTich ?? "",
            AnhChinh: anhChinh.get(String(sp._id)) ?? null,
            Gia: bt.Gia,
            SoLuongChonMua: line.SoLuongChonMua,
            SoLuongCo: bt.SoLuongCo,
        });
    }

    if (orphanIds.length) {
        GioHang.deleteMany({ _id: { $in: orphanIds } }).catch((err) =>
            console.error("Không dọn được dòng giỏ hàng mồ côi", err)
        );
    }

    return {
        items,
        tongSoLuong: items.reduce((sum, i) => sum + i.SoLuongChonMua, 0),
        tamTinh: items.reduce((sum, i) => sum + i.Gia * i.SoLuongChonMua, 0),
    };
}

// GET /api/me/cart
export const getCart = async (req, res) => {
    try {
        return res.status(200).json({ data: await buildCart(req.user._id) });
    } catch (error) {
        console.error("Lỗi khi gọi getCart", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// POST /api/me/cart   body: { MaSPDungTich, SoLuongChonMua }
// Đã có trong giỏ thì cộng dồn số lượng
export const addToCart = async (req, res) => {
    try {
        const { MaSPDungTich, SoLuongChonMua = 1 } = req.body ?? {};

        if (!isObjectId(MaSPDungTich)) {
            return res.status(400).json({ message: "Mã sản phẩm - dung tích không hợp lệ" });
        }
        if (!isPositiveInt(SoLuongChonMua)) {
            return res.status(400).json({ message: "Số lượng phải là số nguyên >= 1" });
        }

        const bienThe = await SanPhamDungTich.findById(MaSPDungTich).lean();
        const sanPham = bienThe && (await SanPham.findOne({ _id: bienThe.MaSP, DaAn: false }, "_id").lean());
        if (!bienThe || !sanPham) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        if (bienThe.SoLuongCo <= 0) {
            return res.status(400).json({ message: "Sản phẩm này tạm hết hàng" });
        }

        const gioiHan = Math.min(MAX_QTY, bienThe.SoLuongCo);
        const dong = await GioHang.findOne({ MaKH: req.user._id, MaSPDungTich });
        const soLuongMoi = (dong?.SoLuongChonMua ?? 0) + SoLuongChonMua;

        if (soLuongMoi > gioiHan) {
            return res.status(400).json({
                message: `Mỗi sản phẩm chỉ mua tối đa ${gioiHan} (giỏ của bạn đang có ${dong?.SoLuongChonMua ?? 0})`,
            });
        }

        if (dong) {
            dong.SoLuongChonMua = soLuongMoi;
            await dong.save();
        } else {
            await GioHang.create({ MaKH: req.user._id, MaSPDungTich, SoLuongChonMua });
        }

        return res.status(200).json({ message: "Đã thêm vào giỏ hàng", data: await buildCart(req.user._id) });
    } catch (error) {
        console.error("Lỗi khi gọi addToCart", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// PATCH /api/me/cart/:id   body: { SoLuongChonMua }   (:id là _id của dòng giỏ)
export const updateCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { SoLuongChonMua } = req.body ?? {};

        if (!isObjectId(id)) {
            return res.status(400).json({ message: "Mã dòng giỏ hàng không hợp lệ" });
        }
        if (!isPositiveInt(SoLuongChonMua)) {
            return res.status(400).json({ message: "Số lượng phải là số nguyên >= 1" });
        }

        // lọc theo MaKH để khách không sửa được giỏ của người khác
        const dong = await GioHang.findOne({ _id: id, MaKH: req.user._id });
        if (!dong) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ" });
        }

        const bienThe = await SanPhamDungTich.findById(dong.MaSPDungTich).lean();
        if (!bienThe) {
            return res.status(404).json({ message: "Sản phẩm không còn tồn tại" });
        }

        const gioiHan = Math.min(MAX_QTY, bienThe.SoLuongCo);
        if (SoLuongChonMua > gioiHan) {
            return res.status(400).json({
                message: gioiHan > 0 ? `Chỉ có thể mua tối đa ${gioiHan} sản phẩm này` : "Sản phẩm này tạm hết hàng",
            });
        }

        dong.SoLuongChonMua = SoLuongChonMua;
        await dong.save();

        return res.status(200).json({ data: await buildCart(req.user._id) });
    } catch (error) {
        console.error("Lỗi khi gọi updateCartItem", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// DELETE /api/me/cart/:id
export const removeCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) {
            return res.status(400).json({ message: "Mã dòng giỏ hàng không hợp lệ" });
        }

        const deleted = await GioHang.findOneAndDelete({ _id: id, MaKH: req.user._id });
        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ" });
        }

        return res.status(200).json({ data: await buildCart(req.user._id) });
    } catch (error) {
        console.error("Lỗi khi gọi removeCartItem", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

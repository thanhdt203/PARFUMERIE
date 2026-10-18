import YeuThich from "../models/YeuThich.js";
import SanPham from "../models/SanPham.js";
import HinhAnh from "../models/HinhAnh.js";
// import để Mongoose đăng ký đủ model cho populate
import "../models/ThuongHieu.js";

const MAX_ITEMS = 200;

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

// Danh sách yêu thích của khách, mới thêm đứng đầu, dạng "thẻ sản phẩm" giống GET /api/products.
// Sản phẩm đang bị ẩn (DaAn) không hiện nhưng dòng yêu thích vẫn giữ, hiện lại khi sản phẩm bán trở lại.
const layDanhSach = async (maKH) => {
    const dong = await YeuThich.find({ MaKH: maKH })
        .sort({ createdAt: -1, _id: -1 })
        .limit(MAX_ITEMS)
        .select("MaSP")
        .lean();
    const ids = dong.map((d) => String(d.MaSP));
    if (!ids.length) return [];

    const sanPhams = await SanPham.find({ _id: { $in: ids }, DaAn: false })
        .select("TenSP GiaThapNhat GiaCaoNhat MaTH")
        .populate("MaTH", "TenTH")
        .lean();
    const spMap = new Map(sanPhams.map((sp) => [String(sp._id), sp]));

    const anhChinh = new Map();
    if (spMap.size) {
        const hinhAnhs = await HinhAnh.find({ MaSP: { $in: [...spMap.keys()] } })
            .sort({ LaAnhChinh: -1, ThuTu: 1 })
            .select("MaSP DuongDan")
            .lean();
        for (const ha of hinhAnhs) {
            const k = String(ha.MaSP);
            if (!anhChinh.has(k)) anhChinh.set(k, ha.DuongDan);
        }
    }

    return ids
        .filter((id) => spMap.has(id))
        .map((id) => {
            const sp = spMap.get(id);
            return {
                _id: sp._id,
                TenSP: sp.TenSP,
                TenThuongHieu: sp.MaTH?.TenTH ?? "",
                GiaThapNhat: sp.GiaThapNhat,
                GiaCaoNhat: sp.GiaCaoNhat,
                AnhChinh: anhChinh.get(id) ?? null
            };
        });
};

// GET /api/me/wishlist
export const getWishlist = async (req, res) => {
    try {
        return res.status(200).json({ data: await layDanhSach(req.user._id) });
    } catch (error) {
        console.error("Lỗi khi gọi getWishlist", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// POST /api/me/wishlist   body: { MaSP }   (thêm lần nữa vẫn thành công, không tạo trùng)
export const addToWishlist = async (req, res) => {
    try {
        const { MaSP } = req.body ?? {};
        if (!isObjectId(MaSP)) {
            return res.status(400).json({ message: "Mã sản phẩm không hợp lệ" });
        }
        if (!(await SanPham.exists({ _id: MaSP, DaAn: false }))) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        const maKH = req.user._id;
        if (!(await YeuThich.exists({ MaKH: maKH, MaSP }))) {
            if ((await YeuThich.countDocuments({ MaKH: maKH })) >= MAX_ITEMS) {
                return res.status(400).json({ message: `Danh sách yêu thích tối đa ${MAX_ITEMS} sản phẩm` });
            }
            try {
                await YeuThich.create({ MaKH: maKH, MaSP });
            } catch (e) {
                // 2 yêu cầu cùng lúc: bên kia đã tạo rồi thì coi như xong
                if (e?.code !== 11000) throw e;
            }
        }

        return res.status(200).json({ message: "Đã thêm vào yêu thích", data: await layDanhSach(maKH) });
    } catch (error) {
        console.error("Lỗi khi gọi addToWishlist", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// DELETE /api/me/wishlist/:maSP   (không có trong danh sách vẫn trả về thành công)
export const removeFromWishlist = async (req, res) => {
    try {
        const { maSP } = req.params;
        if (!isObjectId(maSP)) {
            return res.status(400).json({ message: "Mã sản phẩm không hợp lệ" });
        }

        // lọc theo MaKH để khách không xóa được dòng của người khác
        await YeuThich.deleteOne({ MaKH: req.user._id, MaSP: maSP });
        return res.status(200).json({ message: "Đã bỏ khỏi yêu thích", data: await layDanhSach(req.user._id) });
    } catch (error) {
        console.error("Lỗi khi gọi removeFromWishlist", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

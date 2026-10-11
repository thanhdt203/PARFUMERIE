import DanhMucSanPham from "../models/DanhMucSanPham.js";
import ThuongHieu from "../models/ThuongHieu.js";
import DungTich from "../models/DungTich.js";
import SanPham from "../models/SanPham.js";
import SanPhamDungTich from "../models/SanPhamDungTich.js";

const isObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const checkText = (value, field, max) => {
    if (typeof value !== "string" || !value.trim()) return `${field} không được để trống`;
    if (value.trim().length > max) return `${field} tối đa ${max} ký tự`;
    return null;
};

// Tạo bộ xử lý thêm / sửa / xóa dùng chung cho các danh mục nhỏ
//  - fields: { tênTrường: độDàiTốiĐa } (đều bắt buộc khi thêm)
//  - tenField: trường dùng để chống trùng tên (không phân biệt hoa thường)
//  - extra(body, selfId): kiểm tra thêm các trường đặc biệt, trả về { error } hoặc { data }
//  - dangDung(id): trả về câu thông báo nếu đang được dùng nơi khác (không được xóa)
const taoController = ({ Model, ten, fields, tenField, extra, dangDung }) => {
    const trungTen = (value, boQuaId) =>
        Model.exists({
            [tenField]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
            ...(boQuaId ? { _id: { $ne: boQuaId } } : {}),
        });

    const validate = async (body, partial, selfId) => {
        const data = {};
        for (const [field, max] of Object.entries(fields)) {
            if (body[field] === undefined) {
                if (!partial) return { error: `Thiếu trường bắt buộc: ${field}` };
                continue;
            }
            const e = checkText(body[field], field, max);
            if (e) return { error: e };
            data[field] = body[field].trim();
        }
        if (extra) {
            const r = await extra(body, selfId);
            if (r.error) return { error: r.error };
            Object.assign(data, r.data);
        }
        if (partial && Object.keys(data).length === 0) {
            return { error: "Không có trường hợp lệ nào để cập nhật" };
        }
        return { data };
    };

    return {
        create: async (req, res) => {
            try {
                const { error, data } = await validate(req.body ?? {}, false, null);
                if (error) return res.status(400).json({ message: error });

                if (await trungTen(data[tenField])) {
                    return res.status(409).json({ message: `${ten} này đã tồn tại` });
                }

                const doc = await Model.create(data);
                return res.status(201).json({ message: `Đã thêm ${ten.toLowerCase()}`, data: doc });
            } catch (error) {
                console.error(`Lỗi khi thêm ${ten}`, error);
                return res.status(500).json({ message: "Lỗi hệ thống" });
            }
        },

        update: async (req, res) => {
            try {
                const { id } = req.params;
                if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

                const doc = await Model.findById(id);
                if (!doc) return res.status(404).json({ message: `Không tìm thấy ${ten.toLowerCase()}` });

                const { error, data } = await validate(req.body ?? {}, true, id);
                if (error) return res.status(400).json({ message: error });

                if (data[tenField] !== undefined && (await trungTen(data[tenField], id))) {
                    return res.status(409).json({ message: `${ten} này đã tồn tại` });
                }

                doc.set(data);
                await doc.save();
                return res.status(200).json({ message: `Đã cập nhật ${ten.toLowerCase()}`, data: doc });
            } catch (error) {
                console.error(`Lỗi khi sửa ${ten}`, error);
                return res.status(500).json({ message: "Lỗi hệ thống" });
            }
        },

        remove: async (req, res) => {
            try {
                const { id } = req.params;
                if (!isObjectId(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

                if (!(await Model.exists({ _id: id }))) {
                    return res.status(404).json({ message: `Không tìm thấy ${ten.toLowerCase()}` });
                }

                const dangDungMsg = await dangDung(id);
                if (dangDungMsg) return res.status(409).json({ message: dangDungMsg });

                await Model.deleteOne({ _id: id });
                return res.sendStatus(204);
            } catch (error) {
                console.error(`Lỗi khi xóa ${ten}`, error);
                return res.status(500).json({ message: "Lỗi hệ thống" });
            }
        },
    };
};

export const thuongHieuController = taoController({
    Model: ThuongHieu,
    ten: "Thương hiệu",
    fields: { TenTH: 50, MoTa: 150 },
    tenField: "TenTH",
    dangDung: async (id) =>
        (await SanPham.exists({ MaTH: id }))
            ? "Thương hiệu đang có sản phẩm nên không thể xóa"
            : null,
});

export const dungTichController = taoController({
    Model: DungTich,
    ten: "Dung tích",
    fields: { TenDungTich: 20, MoTa: 50 },
    tenField: "TenDungTich",
    dangDung: async (id) =>
        (await SanPhamDungTich.exists({ MaDungTich: id }))
            ? "Dung tích đang được dùng cho sản phẩm nên không thể xóa"
            : null,
});

export const danhMucController = taoController({
    Model: DanhMucSanPham,
    ten: "Danh mục",
    fields: { TenDM: 50, MoTa: 50 },
    tenField: "TenDM",
    // MaDanhMucCha: null (danh mục gốc) hoặc mã của một danh mục khác
    extra: async (body, selfId) => {
        const cha = body.MaDanhMucCha;
        if (cha === undefined) return { data: {} };
        if (cha === null) return { data: { MaDanhMucCha: null } };
        if (!isObjectId(cha)) return { error: "MaDanhMucCha không hợp lệ" };
        if (selfId && cha === String(selfId)) {
            return { error: "Danh mục không thể là cha của chính nó" };
        }

        let hienTai = await DanhMucSanPham.findById(cha, "MaDanhMucCha").lean();
        if (!hienTai) return { error: "Danh mục cha không tồn tại" };

        // chống vòng lặp: đi ngược lên các đời cha, không được gặp lại chính danh mục này
        if (selfId) {
            for (let i = 0; i < 20 && hienTai?.MaDanhMucCha; i += 1) {
                if (String(hienTai.MaDanhMucCha) === String(selfId)) {
                    return { error: "Không thể chọn danh mục con làm danh mục cha" };
                }
                hienTai = await DanhMucSanPham.findById(hienTai.MaDanhMucCha, "MaDanhMucCha").lean();
            }
        }
        return { data: { MaDanhMucCha: cha } };
    },
    dangDung: async (id) => {
        if (await SanPham.exists({ MaDM: id })) return "Danh mục đang có sản phẩm nên không thể xóa";
        if (await DanhMucSanPham.exists({ MaDanhMucCha: id })) return "Danh mục đang có danh mục con nên không thể xóa";
        return null;
    },
});
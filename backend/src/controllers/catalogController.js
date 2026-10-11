import ThuongHieu from "../models/ThuongHieu.js";
import DanhMucSanPham from "../models/DanhMucSanPham.js";
import DungTich from "../models/DungTich.js";

const layDanhSach = (Model, sort) => async (req, res) => {
    try {
        const data = await Model.find().sort(sort).lean();
        return res.status(200).json({ data });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách", Model.modelName, error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getThuongHieu = layDanhSach(ThuongHieu, { TenTH: 1 });
export const getDanhMuc = layDanhSach(DanhMucSanPham, { TenDM: 1 });
export const getDungTich = layDanhSach(DungTich, { TenDungTich: 1 });
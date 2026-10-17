import Voucher from "../models/Voucher.js";
import DonHang from "../models/DonHang.js";
import { tinhTrang, tinhTienGiam, loiTheoTinhTrang } from "./voucherRules.js";

// Lỗi voucher khách có thể sửa được (sai mã, hết hạn, chưa đủ đơn tối thiểu...), trả thẳng message cho khách
export class VoucherError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Số lượt đang tính vào hạn mức: mọi đơn gắn voucher mà chưa hủy (khớp cách admin thống kê)
export const demLuotDung = (voucherId) =>
    DonHang.countDocuments({ MaVoucher: voucherId, TrangThai: { $ne: "Đã hủy" } });

const formatVnd = (n) => `${Number(n).toLocaleString("vi-VN")}đ`;

/**
 * Kiểm tra mã khách nhập có dùng được cho đơn có tổng tiền hàng `tamTinh` không.
 * Trả về { voucher, tienGiam } hoặc ném VoucherError.
 */
export const kiemTraVoucherChoDon = async (maCodeRaw, tamTinh, now = new Date()) => {
    const code = typeof maCodeRaw === "string" ? maCodeRaw.trim().toUpperCase() : "";
    if (!code) throw new VoucherError("Vui lòng nhập mã giảm giá");

    const voucher = await Voucher.findOne({ MaCode: code }).lean();
    if (!voucher) throw new VoucherError("Mã giảm giá không tồn tại");

    const daDung = await demLuotDung(voucher._id);
    const loi = loiTheoTinhTrang(tinhTrang(voucher, daDung, now));
    if (loi) throw new VoucherError(loi);

    const donToiThieu = voucher.DonToiThieu ?? 0;
    if (tamTinh < donToiThieu) {
        throw new VoucherError(`Đơn hàng cần tối thiểu ${formatVnd(donToiThieu)} để dùng mã này`);
    }

    return { voucher, tienGiam: tinhTienGiam(voucher, tamTinh) };
};

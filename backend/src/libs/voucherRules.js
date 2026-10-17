import { LOAI_GIAM } from "../models/Voucher.js";

// Quy tắc nghiệp vụ của voucher, tách riêng (không đụng DB) để controller gọn và dễ kiểm thử.

const MUI_GIO_VN = "+07:00";
const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
const MA_CODE_REGEX = /^[A-Z0-9_-]{3,30}$/;

export const TINH_TRANG_VOUCHER = ["hoatdong", "saptoi", "hethan", "hetluot", "tat"];

// "2026-10-15" -> 00:00 (đầu ngày) hoặc 23:59:59.999 (cuối ngày) theo giờ Việt Nam
export const parseNgay = (value, cuoiNgay = false) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00${MUI_GIO_VN}`);
    if (Number.isNaN(d.getTime())) return null;
    // chặn ngày không có thật (30/02 bị JS tự dồn sang tháng sau)
    const ngayVN = new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (ngayVN !== value) return null;
    return cuoiNgay ? new Date(d.getTime() + MOT_NGAY_MS - 1) : d;
};

// Tình trạng của voucher tại thời điểm `now`
export const tinhTrang = (v, daDung, now = new Date()) => {
    if (v.DangBat === false) return "tat";
    if (now < new Date(v.NgayBatDau)) return "saptoi";
    if (now > new Date(v.NgayKetThuc)) return "hethan";
    if (v.SoLuong != null && daDung >= v.SoLuong) return "hetluot";
    return "hoatdong";
};

const laSoNguyen = (v) => typeof v === "number" && Number.isInteger(v);

const loi = (message, status = 400) => ({ error: message, status });

/**
 * Kiểm tra dữ liệu thêm / sửa voucher.
 *  - current: voucher hiện tại (lean) khi sửa, null khi thêm mới
 *  - soDon:   số đơn đã gắn voucher này (kể cả đơn đã hủy)
 *  - daDung:  số lượt đang tính vào hạn mức (đơn chưa hủy)
 * Trả về { data } gồm đúng các trường cần ghi, hoặc { error, status }.
 */
export const kiemTraDuLieu = (body, { current = null, soDon = 0, daDung = 0, now = new Date() } = {}) => {
    const b = body && typeof body === "object" ? body : {};
    const co = (k) => b[k] !== undefined;
    const data = {};

    // --- mã ---
    if (co("MaCode")) {
        if (typeof b.MaCode !== "string") return loi("MaCode phải là chuỗi");
        const code = b.MaCode.trim().toUpperCase();
        if (!MA_CODE_REGEX.test(code)) {
            return loi("Mã voucher gồm 3-30 ký tự: chữ không dấu, số, gạch ngang (-) hoặc gạch dưới (_)");
        }
        data.MaCode = code;
    } else if (!current) {
        return loi("Thiếu trường bắt buộc: MaCode");
    }

    // --- loại giảm + giá trị ---
    if (co("LoaiGiam")) {
        if (!LOAI_GIAM.includes(b.LoaiGiam)) return loi(`LoaiGiam không hợp lệ. Chỉ nhận: ${LOAI_GIAM.join(", ")}`);
        data.LoaiGiam = b.LoaiGiam;
    } else if (!current) {
        return loi("Thiếu trường bắt buộc: LoaiGiam");
    }

    if (co("GiaTri")) {
        if (!laSoNguyen(b.GiaTri) || b.GiaTri <= 0) return loi("Giá trị giảm phải là số nguyên lớn hơn 0");
        data.GiaTri = b.GiaTri;
    } else if (!current) {
        return loi("Thiếu trường bắt buộc: GiaTri");
    }

    const loai = data.LoaiGiam ?? current?.LoaiGiam ?? "tien";
    const giaTri = data.GiaTri ?? current?.GiaTri;
    if (loai === "phantram" && (giaTri < 1 || giaTri > 100)) {
        return loi("Giảm theo phần trăm phải từ 1 đến 100");
    }

    // --- giảm tối đa (chỉ dành cho giảm theo %) ---
    if (co("GiamToiDa")) {
        if (b.GiamToiDa !== null && (!laSoNguyen(b.GiamToiDa) || b.GiamToiDa <= 0)) {
            return loi("Giảm tối đa phải là số nguyên lớn hơn 0 (hoặc để trống nếu không giới hạn)");
        }
        if (loai === "tien" && b.GiamToiDa !== null) {
            return loi("Giảm tối đa chỉ dùng khi giảm theo phần trăm");
        }
        data.GiamToiDa = b.GiamToiDa;
    } else if (loai === "tien" && co("LoaiGiam") && current?.GiamToiDa != null) {
        data.GiamToiDa = null; // đổi sang giảm tiền thì bỏ mức giảm tối đa cũ
    }

    // --- đơn tối thiểu ---
    if (co("DonToiThieu")) {
        if (!laSoNguyen(b.DonToiThieu) || b.DonToiThieu < 0) return loi("Đơn tối thiểu phải là số nguyên từ 0 trở lên");
        data.DonToiThieu = b.DonToiThieu;
    }
    const donToiThieu = data.DonToiThieu ?? current?.DonToiThieu ?? 0;
    if (loai === "tien" && donToiThieu > 0 && giaTri > donToiThieu) {
        return loi("Số tiền giảm không được lớn hơn đơn tối thiểu");
    }

    // --- số lượt ---
    if (co("SoLuong")) {
        if (b.SoLuong !== null && (!laSoNguyen(b.SoLuong) || b.SoLuong < 1)) {
            return loi("Số lượt dùng phải là số nguyên từ 1 trở lên (hoặc để trống nếu không giới hạn)");
        }
        if (b.SoLuong !== null && b.SoLuong < daDung) {
            return loi(`Số lượt dùng không được nhỏ hơn số lượt đã dùng (${daDung})`);
        }
        data.SoLuong = b.SoLuong;
    }

    // --- bật / tắt ---
    if (co("DangBat")) {
        if (typeof b.DangBat !== "boolean") return loi("DangBat phải là true hoặc false");
        data.DangBat = b.DangBat;
    }

    // --- thời gian áp dụng ---
    if (co("NgayBatDau")) {
        const d = parseNgay(b.NgayBatDau, false);
        if (!d) return loi("Ngày bắt đầu không hợp lệ (định dạng YYYY-MM-DD)");
        data.NgayBatDau = d;
    } else if (!current) {
        return loi("Thiếu trường bắt buộc: NgayBatDau");
    }
    if (co("NgayKetThuc")) {
        const d = parseNgay(b.NgayKetThuc, true);
        if (!d) return loi("Ngày kết thúc không hợp lệ (định dạng YYYY-MM-DD)");
        data.NgayKetThuc = d;
    } else if (!current) {
        return loi("Thiếu trường bắt buộc: NgayKetThuc");
    }
    const batDau = data.NgayBatDau ?? new Date(current.NgayBatDau);
    const ketThuc = data.NgayKetThuc ?? new Date(current.NgayKetThuc);
    if (batDau > ketThuc) return loi("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
    if (!current && ketThuc < now) return loi("Ngày kết thúc phải từ hôm nay trở đi");

    // --- voucher đã gắn vào đơn: không đổi mức giảm / mã (đơn cũ hiển thị theo voucher này) ---
    if (current && soDon > 0) {
        const daDoiMuc =
            (data.LoaiGiam !== undefined && data.LoaiGiam !== (current.LoaiGiam ?? "tien")) ||
            (data.GiaTri !== undefined && data.GiaTri !== current.GiaTri) ||
            (data.GiamToiDa !== undefined && data.GiamToiDa !== (current.GiamToiDa ?? null));
        // voucher cũ chưa có mã thì vẫn được đặt mã lần đầu
        const daDoiMa = data.MaCode !== undefined && current.MaCode && data.MaCode !== current.MaCode;
        if (daDoiMuc || daDoiMa) {
            return loi(
                "Voucher đã được dùng trong đơn hàng nên không thể đổi mã hoặc mức giảm. Hãy tắt voucher này và tạo voucher mới",
                409
            );
        }
    }

    if (current && Object.keys(data).length === 0) return loi("Không có trường hợp lệ nào để cập nhật");
    return { data };
};

// ---------- Áp voucher vào đơn hàng của khách ----------

// Số tiền được giảm khi áp `v` lên tổng tiền hàng `tamTinh` (VND, số nguyên, không vượt quá tiền hàng)
export const tinhTienGiam = (v, tamTinh) => {
    const loai = v.LoaiGiam ?? "tien";
    let giam = loai === "phantram" ? Math.floor((tamTinh * v.GiaTri) / 100) : v.GiaTri;
    if (loai === "phantram" && v.GiamToiDa != null) giam = Math.min(giam, v.GiamToiDa);
    return Math.max(0, Math.min(giam, tamTinh));
};

// Thông báo cho khách theo tình trạng voucher (null = dùng được)
export const loiTheoTinhTrang = (tt) =>
    ({
        tat: "Mã giảm giá hiện không được áp dụng",
        saptoi: "Mã giảm giá chưa đến thời gian áp dụng",
        hethan: "Mã giảm giá đã hết hạn",
        hetluot: "Mã giảm giá đã hết lượt sử dụng"
    })[tt] ?? null;

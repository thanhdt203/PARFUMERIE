// Quy tắc nghiệp vụ của trang Kho hàng, tách riêng (không đụng DB) để dễ kiểm thử.

export const MAX_TON = 1_000_000; // chặn nhập nhầm số quá lớn
export const NGUONG_MAC_DINH = 5; // tồn <= ngưỡng này (và > 0) là "sắp hết"
export const TRANG_THAI_KHO = ["hethang", "saphet", "conhang"];

// Tình trạng tồn kho của một biến thể
export const phanLoaiTon = (soLuong, nguong = NGUONG_MAC_DINH) => {
    if (soLuong <= 0) return "hethang";
    if (soLuong <= nguong) return "saphet";
    return "conhang";
};

// Đọc ngưỡng "sắp hết" từ query (?nguong=10)
export const docNguong = (value) => {
    if (value === undefined || value === "") return { value: NGUONG_MAC_DINH };
    if (!/^\d+$/.test(String(value))) return { error: "nguong phải là số nguyên dương" };
    const n = Number(value);
    if (n < 1 || n > 1000) return { error: "nguong phải từ 1 đến 1000" };
    return { value: n };
};

const laSoNguyen = (v) => typeof v === "number" && Number.isInteger(v);

/**
 * Kiểm tra body điều chỉnh tồn kho. Gửi đúng một trong hai:
 *  - { ThayDoi: n }   cộng (n > 0) hoặc trừ (n < 0) vào tồn hiện tại (nhập thêm / giảm bớt)
 *  - { SoLuongCo: n } đặt lại đúng số lượng này (kiểm kê)
 * Trả về { data: { kieu: "delta" | "set", giaTri } } hoặc { error }.
 */
export const kiemTraDieuChinh = (body) => {
    const b = body && typeof body === "object" ? body : {};
    const coDelta = b.ThayDoi !== undefined;
    const coSet = b.SoLuongCo !== undefined;
    if (coDelta === coSet) {
        return { error: "Chỉ gửi một trong hai: ThayDoi (cộng/trừ) hoặc SoLuongCo (đặt lại số lượng)" };
    }

    if (coDelta) {
        if (!laSoNguyen(b.ThayDoi) || b.ThayDoi === 0 || Math.abs(b.ThayDoi) > MAX_TON) {
            return { error: `ThayDoi phải là số nguyên khác 0, tối đa ${MAX_TON}` };
        }
        return { data: { kieu: "delta", giaTri: b.ThayDoi } };
    }

    if (!laSoNguyen(b.SoLuongCo) || b.SoLuongCo < 0 || b.SoLuongCo > MAX_TON) {
        return { error: `SoLuongCo phải là số nguyên từ 0 đến ${MAX_TON}` };
    }
    return { data: { kieu: "set", giaTri: b.SoLuongCo } };
};

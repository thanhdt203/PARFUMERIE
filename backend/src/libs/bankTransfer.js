// Tạo thông tin chuyển khoản + mã QR (VietQR) cho đơn hàng.
// Dùng ảnh QR của img.vietqr.io: không cần API key, chỉ ghép URL.
// Tài khoản nhận tiền cấu hình trong backend/.env (xem .env.example).

// Đọc env trong hàm (không đọc ở đầu file) vì dotenv.config() ở server.js chạy sau các import.

export const TRANG_THAI_THANH_TOAN = ["Chưa thanh toán", "Đã thanh toán"];

/** Nhận diện phương thức "Chuyển khoản ngân hàng" theo tên (khớp cách làm ở frontend) */
export const laChuyenKhoan = (tenPTTT) =>
    typeof tenPTTT === "string" && tenPTTT.normalize("NFC").toLowerCase().includes("chuyển khoản");

/** Nội dung chuyển khoản: ngắn, không dấu, suy ra được mã đơn. Ví dụ PARF65AB12 (khớp mã đơn #65AB12) */
export const noiDungChuyenKhoan = (maDon) => `PARF${String(maDon).slice(-6).toUpperCase()}`;

/**
 * Trả về thông tin để khách chuyển khoản, hoặc null nếu chưa cấu hình tài khoản nhận tiền.
 * Số tiền luôn lấy từ đơn trên server, khách không sửa được.
 */
export const layThongTinChuyenKhoan = (don) => {
    const { BANK_ID, BANK_ACCOUNT, BANK_ACCOUNT_NAME, BANK_NAME } = process.env;
    if (!BANK_ID || !BANK_ACCOUNT) return null;

    const noiDung = noiDungChuyenKhoan(don._id);
    const query = [`amount=${encodeURIComponent(String(don.TongTien))}`, `addInfo=${encodeURIComponent(noiDung)}`];
    if (BANK_ACCOUNT_NAME) query.push(`accountName=${encodeURIComponent(BANK_ACCOUNT_NAME)}`);

    return {
        NganHang: BANK_NAME || BANK_ID,
        SoTaiKhoan: BANK_ACCOUNT,
        TenTaiKhoan: BANK_ACCOUNT_NAME || "",
        SoTien: don.TongTien,
        NoiDung: noiDung,
        QrUrl: `https://img.vietqr.io/image/${encodeURIComponent(BANK_ID)}-${encodeURIComponent(BANK_ACCOUNT)}-compact2.png?${query.join("&")}`
    };
};

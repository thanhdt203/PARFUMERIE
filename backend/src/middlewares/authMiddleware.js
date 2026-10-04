import jwt from 'jsonwebtoken';
import KhachHang from '../models/KhachHang.js';

export const protectedRoute = (req, res, next) => {
    try {
        // lấy token từ header
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Không tìm thấy access token" });
        }

        // xác minh token hợp lệ
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedKhachHang) => {
            if (err) {
                console.error(err);
                return res.status(403).json({ message: 'Access token hết hạn hoặc không đúng' });
            }

            try {
                // tìm khách hàng, bỏ trường mật khẩu
                const khachHang = await KhachHang.findById(decodedKhachHang.khachHangId).select('-MatKhau');

                if (!khachHang) {
                    return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
                }

                // trả khách hàng về trong req
                req.khachHang = khachHang;
                next();
            } catch (error) {
                console.error('Lỗi khi tìm khách hàng trong authMiddleware', error);
                return res.status(500).json({ message: "Lỗi hệ thống" });
            }
        });
    } catch (error) {
        console.error('Lỗi khi xác minh JWT trong authMiddleware', error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
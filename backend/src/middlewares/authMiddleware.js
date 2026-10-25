import jwt from 'jsonwebtoken';
import KhachHang from '../models/KhachHang.js';
import NhanVien from '../models/NhanVien.js';

export const protectedRoute = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Không tìm thấy access token" });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Access token hết hạn hoặc không đúng' });
        }

        try {
            const Model = decoded.role === 'customer' ? KhachHang : NhanVien;
            const user = await Model.findById(decoded.userId).select('-MatKhau');

            if (!user) {
                return res.status(404).json({ message: 'Người dùng không tồn tại.' });
            }

            req.user = user;
            req.role = decoded.role === 'customer' ? 'customer' : user.VaiTro;
            next();
        } catch (error) {
            console.error('Lỗi trong protectedRoute', error);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
    });
};

// chặn theo vai trò
export const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.role)) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    next();
};

// Không bắt buộc đăng nhập: có token hợp lệ thì gắn req.user/req.role, ngược lại coi như khách vãng lai
export const optionalAuth = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return next();
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) return next();
        try {
            const Model = decoded.role === 'customer' ? KhachHang : NhanVien;
            const user = await Model.findById(decoded.userId).select('-MatKhau');
            if (user) {
                req.user = user;
                req.role = decoded.role === 'customer' ? 'customer' : user.VaiTro;
            }
        } catch (error) {
            console.error('Lỗi trong optionalAuth', error);
        }
        next();
    });
};

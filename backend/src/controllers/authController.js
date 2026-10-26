import bcrypt from 'bcrypt'
import KhachHang from '../models/KhachHang.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';
import NhanVien from '../models/NhanVien.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

export const signUp = async (req, res) => {
    try {
        const { Ho, Ten, Email, MatKhau, SoDienThoai } = req.body;
 
        if (!Ho || !Ten || !Email || !MatKhau || !SoDienThoai) {
            return res
                .status(400)
                .json({ message: "Không thể thiếu Họ, Tên, Email, Mật khẩu và Số điện thoại" });
        }

        // Kiểm tra email và số điện thoại có tồn tại chưa
        const duplicate = await KhachHang.findOne({
            $or: [{ Email }, { SoDienThoai }],
        });

        if(duplicate) {
            return res.status(409).json({message: "Email hoặc số điện thoại đã sử dụng"});
        }

        // mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(MatKhau, 10); 

        // tạo người dùng mới

        await KhachHang.create({
            Ho, Ten,
            Email,
            MatKhau: hashedPassword,
            SoDienThoai,
        });

        // return

        return res.sendStatus(204);

    } catch (error) {
        console.error("Lỗi khi gọi signUp", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Quy trình: kiểm tra input, kiểm tra email và số điện thoại có tồn tại chưa, mã hóa mật khẩu, tạo tài khoản, trả về 204 nếu thành công và 500 nếu thất bại.

export const signIn = async (req, res) => {
    try {
        const { TaiKhoan, MatKhau } = req.body; // email (khách) hoặc tên đăng nhập (nhân viên)

        if (!TaiKhoan || !MatKhau) {
            return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu." });
        }

        let user = await KhachHang.findOne({ Email: TaiKhoan });
        let role = 'customer';

        if (!user) {
            user = await NhanVien.findOne({ TenDangNhap: TaiKhoan });
            role = user?.VaiTro;
        }

        // cùng một thông báo cho cả 2 trường hợp sai
        if (!user || !(await bcrypt.compare(MatKhau, user.MatKhau))) {
            return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không chính xác." });
        }

        // chỉ báo khóa sau khi đã đúng mật khẩu để không lộ tài khoản nào tồn tại
        if (user.BiKhoa) {
            return res.status(403).json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
        }

        const accessToken = jwt.sign(
            { userId: user._id, role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        const refreshToken = crypto.randomBytes(64).toString("hex");

        await Session.create({
            userId: user._id,
            role,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, secure: true, sameSite: 'none', maxAge: REFRESH_TOKEN_TTL
        });

        return res.status(200).json({ accessToken, role });
    } catch (error) {
        console.error("Lỗi khi gọi signIn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const signOut = async (req, res) => {
    try {
        // lấy refresh token từ cookie

        const token = req.cookies?.refreshToken;

        if(token) {
            // xóa refresh token trong Session
            
            await Session.deleteOne({ refreshToken: token });

            // xóa cookie

            res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: 'none' });
        }

        return res.sendStatus(204);

    } catch (error) {
        console.error("Lỗi khi gọi signOut", error);
        return res.status(500).json({ message: "Lỗi hệ thống"});
    }
};

export const refreshToken = async (req, res) => {
    try {
        // lấy refresh token từ cookie
        const token = req.cookies?.refreshToken;

        if (!token) {
            return res.status(401).json({ message: "Không tìm thấy refresh token" });
        }

        // so với refresh token trong Session
        const session = await Session.findOne({ refreshToken: token });

        if (!session) {
            return res.status(403).json({ message: "Refresh token không hợp lệ" });
        }

        // kiểm tra hết hạn
        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: "Refresh token đã hết hạn" });
        }

        // tạo access token mới
        const accessToken = jwt.sign(
    { userId: session.userId, role: session.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
);
return res.status(200).json({ accessToken, role: session.role });
    } catch (error) {
        console.error("Lỗi khi gọi refreshToken", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
import bcrypt from 'bcrypt'
import KhachHang from '../models/KhachHang.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

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
        // lấy input
        const { Email, MatKhau } = req.body;

        if (!Email || !MatKhau) {
            return res.status(400).json({ message: "Thiếu email hoặc mật khẩu." });
        }

        // lấy hashedPassword trong db để so với password input
        const khachHang = await KhachHang.findOne({Email});

        if (!khachHang) {
            return res.status(401).json({ message: 'Email không chính xác.' })
        }

        // kiểm tra password
        const passwordCorrect = await bcrypt.compare(MatKhau, khachHang.MatKhau)

        if (!passwordCorrect) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' })
        }
        // nếu khớp, tạo accessToken với JWT

        const accessToken = jwt.sign( { khachHangId: khachHang._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

        // tạo refesh token

        const refreshToken = crypto.randomBytes(64).toString("hex")

        // tạo session mới để lưu refresh token

        await Session.create({
            khachHangId: khachHang._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        })

        // trả refresh token về trong cookie

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none', // backend, frontend deploy riêng
            maxAge: REFRESH_TOKEN_TTL
        });

        // trả access token về trong res

        return res.status(200).json({ message: `Khách hàng ${khachHang.Ten} đã đăng nhập!`, accessToken,});

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
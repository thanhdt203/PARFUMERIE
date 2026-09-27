import bcrypt from 'bcrypt'
import KhachHang from '../models/KhachHang.js';
import jwt from 'jsonwebtoken';

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
        const passwordCorrect = await bcrypt.compare(MatKhau, khachHang.hashedPassword)

        if (!passwordCorrect) {
            return res.status(401).json({ message: 'Email không chính xác.' })
        }
        // nếu khớp, tạo accessToken với JWT

        const accessToken = jwt.sign({ khachHang.ObjectId })

        // tạo refesh token

        // tạo session mới để lưu refresh token

        // trả refresh token về trong cookie

        // trả access token về trong res

    } catch (error) {
        console.error("Lỗi khi gọi signIn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
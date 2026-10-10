import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "./libs/db.js";
import NhanVien from "./models/NhanVien.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const tonTai = await NhanVien.findOne({ TenDangNhap: "admin" });
  if (tonTai) {
    console.log("Admin đã tồn tại.");
  } else {
    await NhanVien.create({
      HoTenNV: "Quản trị viên",
      TenDangNhap: "admin",
      MatKhau: await bcrypt.hash("thanhdt", 10),
      SoDienThoai: "0900000000",
      SoCCCD: "000000000000",
      VaiTro: "admin",
    });
    console.log("Đã tạo admin.");
  }

  await mongoose.connection.close();
  process.exit(0);
};

run();
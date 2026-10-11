import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from "./libs/db.js";
import authRoute from './routers/authRoute.js';
import khachHangRoute from './routers/khachHangRoute.js';
import meRoute from './routers/meRoute.js';
import productRoute from './routers/productRoute.js';
import catalogRoute from './routers/catalogRoute.js';
import adminProductRoute from './routers/adminProductRoute.js';
import adminCatalogRoute from './routers/adminCatalogRoute.js';
import { protectedRoute, authorize } from "./middlewares/authMiddleware.js";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5001;

// middlewares
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// public routes (không cần đăng nhập) - PHẢI đặt trước protectedRoute
app.use('/api/auth', authRoute);
app.use('/api/products', productRoute);
app.use('/api/catalog', catalogRoute);

// private routes
app.use(protectedRoute);
app.use('/api/me', meRoute);
app.use('/api/khachhangs', authorize('customer'), khachHangRoute);
app.use('/api/admin/products', authorize('staff', 'admin'), adminProductRoute);
app.use('/api/admin/catalog', authorize('staff', 'admin'), adminCatalogRoute);

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: "Body không phải JSON hợp lệ" });
    }
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
});


connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`server bắt đầu trên cổng ${PORT}`);
    });
});
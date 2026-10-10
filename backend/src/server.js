import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from "./libs/db.js";
import authRoute from './routers/authRoute.js';
import khachHangRoute from './routers/khachHangRoute.js';
import meRoute from './routers/meRoute.js';
import { protectedRoute, authorize } from "./middlewares/authMiddleware.js";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5001;

// middlewares
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// public routes
app.use('/api/auth', authRoute);

// private routes
app.use(protectedRoute);
app.use('/api/me', meRoute);
app.use('/api/khachhangs', authorize('customer'), khachHangRoute);


connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`server bắt đầu trên cổng ${PORT}`);
    });
});
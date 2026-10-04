import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";
import authRoute from './routers/authRoute.js';
import khachHangRoute from './routers/khachHangRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from "./middlewares/authMiddleware.js";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5001;

// middleewares
app.use(express.json());
app.use(cookieParser());

// public routes
app.use('/api/auth', authRoute);

// private routes
app.use(protectedRoute);
app.use('/api/khachhangs', khachHangRoute);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`server bắt đầu trên cổng ${PORT}`);
    });
});



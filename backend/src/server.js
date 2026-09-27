import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";
import authRoute from './routers/authRoute.js'

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5001;

// middleewares
app.use(express.json());

// public routes
app.use('/api/auth', authRoute);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`server bắt đầu trên cổng ${PORT}`);
    });
});



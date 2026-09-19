import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";

dotenv.config()

const app = express();
const PORT = process.env.POST || 5001;

// middleewares
app.use(express.json());


connectDB().then(() => {
    app.listen(POST, () => {
        console.log(`server bắt đầu trên cổng ${POST}`);
    });
});



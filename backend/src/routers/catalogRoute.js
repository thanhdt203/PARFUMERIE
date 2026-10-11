import express from "express";
import { getThuongHieu, getDanhMuc, getDungTich } from "../controllers/catalogController.js";

const router = express.Router();

router.get("/thuonghieu", getThuongHieu);
router.get("/danhmuc", getDanhMuc);
router.get("/dungtich", getDungTich);

export default router;
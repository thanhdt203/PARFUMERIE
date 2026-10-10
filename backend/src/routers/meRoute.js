import express from "express";
import { authMe } from "../controllers/khachHangController.js";

const router = express.Router();
router.get('/', authMe);

export default router;
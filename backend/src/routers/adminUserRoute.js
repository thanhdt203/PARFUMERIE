import express from "express";
import { listUsers, updateUserRole, updateUserStatus, resetUserPassword } from "../controllers/adminUserController.js";

// Route này đã được gắn authorize('admin') ở server.js: chỉ admin quản lý người dùng.
const router = express.Router();

router.get("/", listUsers);
router.patch("/:id/role", updateUserRole);
router.patch("/:id/status", updateUserStatus);
router.post("/:id/reset-password", resetUserPassword);

export default router;

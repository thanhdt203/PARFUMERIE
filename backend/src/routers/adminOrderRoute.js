import express from "express";
import {
    listOrders,
    getOrder,
    updateOrderStatus,
    exportOrders,
} from "../controllers/adminOrderController.js";

// Route này đã được gắn authorize('staff', 'admin') ở server.js.
const router = express.Router();

router.get("/export", exportOrders); // phải đặt trước "/:id"
router.get("/", listOrders);
router.get("/:id", getOrder);
router.patch("/:id/trangthai", updateOrderStatus);

export default router;

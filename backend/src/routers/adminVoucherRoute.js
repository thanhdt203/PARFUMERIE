import express from "express";
import { authorize } from "../middlewares/authMiddleware.js";
import {
    listVouchers,
    getVoucher,
    createVoucher,
    updateVoucher,
    removeVoucher,
} from "../controllers/adminVoucherController.js";

// Route này đã được gắn authorize('staff', 'admin') ở server.js.
// Xóa voucher thì chỉ admin được làm.
const router = express.Router();

router.get("/", listVouchers);
router.get("/:id", getVoucher);
router.post("/", createVoucher);
router.put("/:id", updateVoucher);
router.delete("/:id", authorize("admin"), removeVoucher);

export default router;

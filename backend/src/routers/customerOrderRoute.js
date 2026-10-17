import express from "express";
import {
    getPaymentMethods,
    createOrder,
    listMyOrders,
    getMyOrder,
    cancelMyOrder,
    previewVoucher
} from "../controllers/customerOrderController.js";

const router = express.Router();

router.get("/payment-methods", getPaymentMethods); // phải đặt trước "/:id"
router.post("/voucher/preview", previewVoucher);
router.get("/", listMyOrders);
router.post("/", createOrder);
router.get("/:id", getMyOrder);
router.patch("/:id/huy", cancelMyOrder);

export default router;

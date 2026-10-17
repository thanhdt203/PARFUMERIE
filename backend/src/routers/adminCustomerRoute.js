import express from "express";
import { listCustomers, getCustomer } from "../controllers/adminCustomerController.js";

// Route này đã được gắn authorize('staff', 'admin') ở server.js. Chỉ xem, không sửa / xóa khách.
const router = express.Router();

router.get("/", listCustomers);
router.get("/:id", getCustomer);

export default router;

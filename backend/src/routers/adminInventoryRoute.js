import express from "express";
import { listInventory, adjustStock } from "../controllers/adminInventoryController.js";

// Route này đã được gắn authorize('staff', 'admin') ở server.js.
const router = express.Router();

router.get("/", listInventory);
router.patch("/:id", adjustStock);

export default router;

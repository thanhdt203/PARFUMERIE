import express from "express";
import { optionalAuth } from "../middlewares/authMiddleware.js";
import { getProducts, getProductById, getFilterOptions } from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/filters", getFilterOptions);
router.get("/:id", optionalAuth, getProductById);

export default router;
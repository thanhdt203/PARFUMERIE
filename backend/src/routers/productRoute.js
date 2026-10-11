import express from "express";
import { getProducts, getProductById, getFilterOptions } from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/filters", getFilterOptions);
router.get("/:id", getProductById);

export default router;
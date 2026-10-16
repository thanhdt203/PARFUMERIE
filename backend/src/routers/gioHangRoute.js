import express from "express";
import { getCart, addToCart, updateCartItem, removeCartItem } from "../controllers/gioHangController.js";

const router = express.Router();

router.get("/", getCart);
router.post("/", addToCart);
router.patch("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

export default router;

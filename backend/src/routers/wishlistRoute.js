import express from "express";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlistController.js";

const router = express.Router();

router.get("/", getWishlist);
router.post("/", addToWishlist);
router.delete("/:maSP", removeFromWishlist);

export default router;

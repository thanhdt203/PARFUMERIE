import express from "express";
import { authorize } from "../middlewares/authMiddleware.js";
import {
    listAdminProducts,
    getAdminProduct,
    createProduct,
    updateProduct,
    setProductHidden,
    deleteProduct,
    addVariant,
    updateVariant,
    deleteVariant,
} from "../controllers/adminProductController.js";

const router = express.Router();

router.get("/", listAdminProducts);
router.post("/", createProduct);
router.get("/:id", getAdminProduct);
router.put("/:id", updateProduct);
router.patch("/:id/an", setProductHidden);
router.delete("/:id", authorize("admin"), deleteProduct);

router.post("/:id/bienthe", addVariant);
router.put("/:id/bienthe/:bid", updateVariant);
router.delete("/:id/bienthe/:bid", authorize("admin"), deleteVariant);

export default router;
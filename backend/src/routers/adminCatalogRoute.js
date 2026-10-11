import express from "express";
import { authorize } from "../middlewares/authMiddleware.js";
import {
    thuongHieuController,
    danhMucController,
    dungTichController,
} from "../controllers/adminCatalogController.js";

// Route này đã được gắn authorize('staff', 'admin') ở server.js.
// Xem danh sách dùng API công khai /api/catalog/*; ở đây chỉ có thêm / sửa / xóa.
// Xóa thì chỉ admin được làm.
const router = express.Router();

const gan = (path, controller) => {
    router.post(`/${path}`, controller.create);
    router.put(`/${path}/:id`, controller.update);
    router.delete(`/${path}/:id`, authorize("admin"), controller.remove);
};

gan("thuonghieu", thuongHieuController);
gan("danhmuc", danhMucController);
gan("dungtich", dungTichController);

export default router;
import express from "express";
import { optionalAuth } from "../middlewares/authMiddleware.js";
import { chat, chatStream } from "./aiController.js";


const router = express.Router();
router.post("/chat", chat);
router.post("/chat/stream", optionalAuth, chatStream);
export default router;


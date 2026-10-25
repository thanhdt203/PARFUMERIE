import express from "express";
import { deleteConversation, getConversation, listConversations } from "./aiHistoryController.js";


const router = express.Router();
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", deleteConversation);
export default router;

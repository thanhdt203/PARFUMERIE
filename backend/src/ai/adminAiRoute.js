import express from "express";
import {
    createKnowledge, deleteKnowledge, getAnyConversation, getConfig, listAllConversations,
    listKnowledge, testAi, updateConfig, updateKnowledge,
} from "./adminAiController.js";


// Đã gắn authorize('admin') ở server.js
const router = express.Router();
router.get("/config", getConfig);
router.put("/config", updateConfig);
router.get("/knowledge", listKnowledge);
router.post("/knowledge", createKnowledge);
router.put("/knowledge/:id", updateKnowledge);
router.delete("/knowledge/:id", deleteKnowledge);
router.get("/conversations", listAllConversations);
router.get("/conversations/:id", getAnyConversation);
router.post("/test", testAi);
export default router;

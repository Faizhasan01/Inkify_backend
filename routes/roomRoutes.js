import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as roomController from "../controllers/roomController.js";

const router = Router();

router.post("/", requireAuth, roomController.createRoom);
router.get("/:roomId", roomController.getRoomInfo);

export default router;

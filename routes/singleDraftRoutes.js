import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as draftController from "../controllers/draftController.js";

const router = Router();

router.get("/:id", requireAuth, draftController.getDraftById);

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as draftController from "../controllers/draftController.js";

const router = Router();

router.post("/", requireAuth, draftController.createDraft);
router.get("/", requireAuth, draftController.getDrafts);
router.get("/:id", requireAuth, draftController.getDraftById);
router.put("/:id", requireAuth, draftController.updateDraft);
router.delete("/:id", requireAuth, draftController.deleteDraft);

export default router;

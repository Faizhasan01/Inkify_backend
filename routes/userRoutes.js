import { Router } from "express";
import * as authController from "../controllers/authController.js";

const router = Router();

router.get("/session", authController.getSession);

export default router;

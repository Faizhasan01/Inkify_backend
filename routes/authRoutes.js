import { Router } from "express";
import { passport, configurePassport } from "../config/passport.js";
import * as authController from "../controllers/authController.js";

const router = Router();

export function setupAuthRoutes(app) {
  const isGoogleConfigured = configurePassport(app);

  if (isGoogleConfigured) {
    router.get("/google", passport.authenticate("google", { 
      scope: ["profile", "email"],
      session: false,
      accessType: 'offline',
      prompt: 'consent'
    }));

    router.get(
      "/google/callback",
      passport.authenticate("google", { session: false, failureRedirect: "/account?error=auth_failed" }),
      authController.handleGoogleCallback
    );
  }

  router.get("/me", authController.getCurrentUser);
  router.post("/register", authController.register);
  router.post("/login", authController.login);
  router.post("/logout", authController.logout);
  router.post("/forgot-password", authController.forgotPassword);
  router.post("/verify-reset-otp", authController.verifyResetOTP);
  router.post("/reset-password", authController.resetPassword);

  return router;
}

export default router;

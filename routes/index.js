import { setupAuthRoutes } from "./authRoutes.js";
import draftRoutes from "./draftRoutes.js";
import singleDraftRoutes from "./singleDraftRoutes.js";
import roomRoutes from "./roomRoutes.js";
import userRoutes from "./userRoutes.js";

export function registerRoutes(app) {
  const authRouter = setupAuthRoutes(app);
  
  app.use("/api/auth", authRouter);
  app.use("/api/drafts", draftRoutes);
  app.use("/api/draft", singleDraftRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/user", userRoutes);
}

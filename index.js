import "dotenv/config";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import cors from "cors";
import crypto from "crypto";
import { createServer } from "http";

import { connectToMongoDB } from "./db/mongodb.js";
import { log } from "./utils/logger.js";
import { registerRoutes } from "./routes/index.js";
import { setupWebSocket } from "./services/websocketService.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

const MemoryStoreSession = MemoryStore(session);

const frontendUrl = process.env.FRONTEND_URL;

app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000,
    }),
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "none",
    },
  })
);

app.use(requestLogger);

(async () => {
  await connectToMongoDB();
  
  registerRoutes(app);
  
  setupWebSocket(httpServer);
  
  app.use(errorHandler);

  const port = parseInt(process.env.PORT, 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`Backend API serving on port ${port}`);
    }
  );
})();

export { log };

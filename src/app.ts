import express, { Application, Request, Response } from "express";
import cors from "cors";
import passport from "passport";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth/authRoutes";
import alertRoutes from "./routes/alerts/alertRoutes";
import reportRoutes from "./routes/reports/reportRoutes";
import statsRoutes from "./routes/reports/statsRoutes";
import profileRoutes from "./routes/users/profileRoutes";
import userRoutes from "./routes/users/userRoutes";
import roleRoutes from "./routes/users/roleRoutes";
import locationRoutes from "./routes/catalogs/locationRoutes";
import reactionRoutes from "./routes/catalogs/reactionRoutes";
import catalogRoutes from "./routes/catalogs/catalogRoutes";
import docsRoutes from "./routes/docs/docsRoutes";
import {
  isAllowedCorsOrigin,
  isApiDocsEnabled,
  resolveAllowedCorsOrigins,
} from "./config/securityConfig";
import { csrfOriginProtection } from "./middleware/csrfProtectionMiddleware";
import { errorHandler } from "./middleware/errorHandler";
import { applySecurityHeaders } from "./middleware/securityHeadersMiddleware";

import authGoogleRoutes from "./routes/auth/authGoogle";
import "./config/googleStrategy";

const app: Application = express();
app.set("trust proxy", 1);

const allowedCorsOrigins = resolveAllowedCorsOrigins();

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ) => {
    callback(null, isAllowedCorsOrigin(origin, allowedCorsOrigins));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(applySecurityHeaders);
app.use(express.json());
app.use(passport.initialize());
app.use(csrfOriginProtection);

app.use("/api/auth", authRoutes);
app.use("/api/auth", authGoogleRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/catalogs", catalogRoutes);

if (isApiDocsEnabled()) {
  app.use("/api/docs", docsRoutes);
} else {
  app.use("/api/docs", (_req: Request, res: Response) => {
    res.status(404).json({ message: "Recurso no encontrado" });
  });
}

app.get("/", (_req: Request, res: Response) => {
  res.send("API DigitalAlertHub activa");
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use(errorHandler);

export default app;

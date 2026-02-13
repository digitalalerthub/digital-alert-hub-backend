import express, { Application, Request, Response } from "express";
import cors from "cors";
import passport from "passport";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/authRoutes";
import alertRoutes from "./routes/alertRoutes";
import statsRoutes from "./routes/statsRoutes";
import profileRoutes from "./routes/profileRoutes";
import userRoutes from "./routes/userRoutes";
import roleRoutes from "./routes/roleRoutes";


import authGoogleRoutes from "./routes/authGoogle"; // <-- IMPORTANTE
import "./config/googleStrategy"; // <-- INICIALIZA PASSPORT GOOGLE

const app: Application = express();

// Configurar CORS para desarrollo y producción
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(passport.initialize()); // <-- NECESARIO PARA GOOGLE

// RUTAS
app.use("/api/auth", authRoutes);
app.use("/api/auth", authGoogleRoutes); // <-- AÑADE Google Login (línea 20)
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);


// ENDPOINT RAÍZ
app.get("/", (req: Request, res: Response) => {
  res.send("API DigitalAlertHub activa");
});

// HEALTH CHECK - Render necesita esto para verificar que el servidor está vivo
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

export default app;

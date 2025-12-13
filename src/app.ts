import express, { Application, Request, Response } from "express";
import cors from "cors";
import passport from "passport";

import authRoutes from "./routes/authRoutes";
import alertRoutes from "./routes/alertRoutes";
import statsRoutes from "./routes/statsRoutes";
import profileRoutes from "./routes/profileRoutes";

import authGoogleRoutes from "./routes/authGoogle"; // <-- IMPORTANTE
import "../src/config/googleStrategy"; // <-- INICIALIZA PASSPORT GOOGLE (línea 10)

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize()); // <-- NECESARIO PARA GOOGLE

// RUTAS
app.use("/api/auth", authRoutes);
app.use("/api/auth", authGoogleRoutes); // <-- AÑADE Google Login (línea 20)
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/profile", profileRoutes);

// ENDPOINT RAÍZ
app.get("/", (req: Request, res: Response) => {
  res.send("API DigitalAlertHub activa");
});

export default app;

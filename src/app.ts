import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import alertRoutes from "./routes/alertRoutes";

const app: Application = express();

app.use(cors());
app.use(express.json());

// rutas
app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertRoutes);

// endpoint raíz
app.get("/", (req: Request, res: Response) => {
  res.send(" API DigitalAlertHub activa");
});

export default app;

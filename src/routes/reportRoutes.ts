import { Router } from "express";
import { getAlertReports } from "../controllers/reportController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/alerts", verifyToken, getAlertReports);

export default router;

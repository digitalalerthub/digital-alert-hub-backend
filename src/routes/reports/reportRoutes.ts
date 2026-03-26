import { Router } from "express";
import { getAlertReports } from "../../controllers/reports/reportController";
import { verifyToken } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/alerts", verifyToken, asyncHandler(getAlertReports));

export default router;

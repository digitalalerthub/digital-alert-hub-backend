import { Router } from "express";
import { getStats } from "../controllers/statsController";

const router = Router();

// GET /api/stats
router.get("/", getStats);

export default router;

import { Router } from "express";
import { getStats } from "../../controllers/reports/statsController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getStats));

export default router;

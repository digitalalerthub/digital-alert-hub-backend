import { Router } from "express";
import { listReacciones } from "../../controllers/catalogs/reactionController";
import { verifyToken } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", verifyToken, asyncHandler(listReacciones));

export default router;

import { Router } from "express";
import { listReacciones } from "../controllers/reactionController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", verifyToken, listReacciones);

export default router;

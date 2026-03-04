import { Router } from "express";
import { reverseAddress, searchAddress } from "../controllers/geoController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/search", verifyToken, searchAddress);
router.get("/reverse", verifyToken, reverseAddress);

export default router;

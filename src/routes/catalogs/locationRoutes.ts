import { Router } from "express";
import { listBarriosByComuna, listComunas } from "../../controllers/catalogs/locationController";
import { verifyToken } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/comunas", verifyToken, asyncHandler(listComunas));
router.get("/comunas/:idComuna/barrios", verifyToken, asyncHandler(listBarriosByComuna));

export default router;

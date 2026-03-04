import { Router } from "express";
import { listBarriosByComuna, listComunas } from "../controllers/locationController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/comunas", verifyToken, listComunas);
router.get("/comunas/:idComuna/barrios", verifyToken, listBarriosByComuna);

export default router;

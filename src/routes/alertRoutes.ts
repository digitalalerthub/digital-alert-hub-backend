import { Router } from "express";
import { createAlerta, listAlerta } from "../controllers/alertController";
import { verifyToken } from "../middleware/authMiddleware";

//  Crea una instancia del enrutador de Express
const router = Router(); // Esto nos permite definir rutas específicas para "alertas"

router.post("/", verifyToken, createAlerta);
router.get("/", verifyToken, listAlerta);

export default router;

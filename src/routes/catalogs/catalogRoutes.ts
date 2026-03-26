import { Router } from "express";
import { listCategorias, listEstados } from "../../controllers/catalogs/catalogController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/estados", asyncHandler(listEstados));
router.get("/categorias", asyncHandler(listCategorias));

export default router;

import { NextFunction, Request, Response, Router } from "express";
import { createAlerta, listAlerta, updateAlerta } from "../controllers/alertController";
import { verifyToken } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

const uploadEvidence = (req: Request, res: Response, next: NextFunction) => {
  upload.single("evidencia")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Archivo de evidencia invalido";
      res.status(400).json({ message });
      return;
    }

    next();
  });
};

const router = Router();

router.post("/", verifyToken, uploadEvidence, createAlerta);
router.get("/", verifyToken, listAlerta);
router.put("/:id", verifyToken, uploadEvidence, updateAlerta);

export default router;

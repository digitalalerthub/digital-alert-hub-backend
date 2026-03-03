import { NextFunction, Request, Response, Router } from "express";
import { createAlerta, listAlerta, updateAlerta } from "../controllers/alertController";
import {
  listAlertReactions,
  toggleAlertReaction,
} from "../controllers/alertReactionController";
import {
  createAlertComment,
  deleteAlertComment,
  listAlertComments,
  updateAlertComment,
} from "../controllers/alertCommentController";
import { verifyToken } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

const uploadEvidence = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([
    { name: "evidencias", maxCount: 10 },
    { name: "evidencia", maxCount: 10 }, // compatibilidad con clientes antiguos
  ])(req, res, (err: unknown) => {
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
router.get("/:id/reactions", verifyToken, listAlertReactions);
router.post("/:id/reactions", verifyToken, toggleAlertReaction);
router.get("/:id/comments", verifyToken, listAlertComments);
router.post("/:id/comments", verifyToken, createAlertComment);
router.put("/:id/comments/:commentId", verifyToken, updateAlertComment);
router.delete("/:id/comments/:commentId", verifyToken, deleteAlertComment);

export default router;

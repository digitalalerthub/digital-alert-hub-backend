// Rutas de administración de usuarios

import { Router } from "express";
import {
  getAllUsers,
  createUserByAdmin,
  updateUserByAdmin,
  changeUserStatus,
} from "../controllers/userController";
import { verifyToken } from "../middleware/authMiddleware";
import { isAdmin } from "../middleware/roleMiddleware";

const router = Router();

// Todas estas rutas requieren estar logueado y ser admin
router.get("/", verifyToken, isAdmin, getAllUsers);
router.post("/", verifyToken, isAdmin, createUserByAdmin);
router.patch("/:id", verifyToken, isAdmin, updateUserByAdmin);
router.patch("/:id/status", verifyToken, isAdmin, changeUserStatus);

export default router;

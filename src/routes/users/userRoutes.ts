// Rutas de administración de usuarios

import { Router } from "express";
import {
  getAllUsers,
  createUserByAdmin,
  updateUserByAdmin,
  changeUserStatus,
} from "../../controllers/users/userController";
import { verifyToken } from "../../middleware/authMiddleware";
import { isAdmin } from "../../middleware/roleMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Todas estas rutas requieren estar logueado y ser admin
router.get("/", verifyToken, isAdmin, asyncHandler(getAllUsers));
router.post("/", verifyToken, isAdmin, asyncHandler(createUserByAdmin));
router.patch("/:id", verifyToken, isAdmin, asyncHandler(updateUserByAdmin));
router.patch("/:id/status", verifyToken, isAdmin, asyncHandler(changeUserStatus));

export default router;

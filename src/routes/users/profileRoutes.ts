import { Router } from "express";
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from "../../controllers/users/profileController";
import { verifyToken } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Todas las rutas requieren autenticación
router.get("/", verifyToken, asyncHandler(getProfile));
router.put("/", verifyToken, asyncHandler(updateProfile));
router.put("/change-password", verifyToken, asyncHandler(changePassword));
router.delete("/", verifyToken, asyncHandler(deleteAccount));

export default router;

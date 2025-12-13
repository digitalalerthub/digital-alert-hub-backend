import { Router } from "express";
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from "../controllers/profileController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Todas las rutas requieren autenticación
router.get("/", verifyToken, getProfile);
router.put("/", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.delete("/", verifyToken, deleteAccount);

export default router;

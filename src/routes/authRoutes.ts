import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); // Genera token + envio de email
router.post("/reset-password/:token", resetPassword); // Valida token y actualiza contraseña (cambio)

export default router;

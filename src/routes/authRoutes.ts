import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyAccount,
  resendVerificationEmail,
} from "../controllers/authController";

const router = Router(); //Crea un router independiente.
// Esto te permite modular el backend
// (cada módulo tiene su propio archivo de rutas).

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/resend-verification", resendVerificationEmail);
router.post("/reset-password/:token", resetPassword);
router.get("/verify-account/:token", verifyAccount);

export default router;

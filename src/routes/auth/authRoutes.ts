import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyAccount,
  resendVerificationEmail,
} from "../../controllers/auth/authController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router(); //Crea un router independiente.
// Esto te permite modular el backend
// (cada módulo tiene su propio archivo de rutas).

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/resend-verification", asyncHandler(resendVerificationEmail));
router.post("/reset-password/:token", asyncHandler(resetPassword));
router.get("/verify-account/:token", asyncHandler(verifyAccount));

export default router;

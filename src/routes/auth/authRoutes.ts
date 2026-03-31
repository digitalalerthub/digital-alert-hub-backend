import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyAccount,
  resendVerificationEmail,
} from "../../controllers/auth/authController";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  resetPasswordRateLimiter,
} from "../../middleware/rateLimitMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router(); //Crea un router independiente.
// Esto te permite modular el backend
// (cada módulo tiene su propio archivo de rutas).

router.post("/register", registerRateLimiter, asyncHandler(register));
router.post("/login", loginRateLimiter, asyncHandler(login));
router.post("/forgot-password", forgotPasswordRateLimiter, asyncHandler(forgotPassword));
router.post(
  "/resend-verification",
  resendVerificationRateLimiter,
  asyncHandler(resendVerificationEmail)
);
router.post("/reset-password/:token", resetPasswordRateLimiter, asyncHandler(resetPassword));
router.get("/verify-account/:token", asyncHandler(verifyAccount));

export default router;

import { Router } from "express";
import passport from "passport";
import "../config/googleStrategy";
import jwt from "jsonwebtoken";

const router = Router();

// Usar authorizationURL personalizada para evitar FedCM
router.get(
  "/google",
  (req, res, next) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "consent", // ⬅️ CAMBIAR A "consent"
      accessType: "offline",
      state: Math.random().toString(36).substring(7) // ⬅️ AGREGAR estado aleatorio
    })(req, res, next);
  }
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req: any, res) => {
    const token = jwt.sign(
      {
        email: req.user.emails[0].value,
        name: req.user.displayName,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

export default router;

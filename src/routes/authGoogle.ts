import { Router } from "express";
import passport from "passport";
import "../config/googleStrategy";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Usuario from "../models/User";

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
    try {
      const googleEmail = req.user?.emails?.[0]?.value;
      const displayName = req.user?.displayName || "";

      if (!googleEmail) {
        return res.status(400).json({ message: "Google no devolvio email" });
      }

      let user = await Usuario.findOne({ where: { email: googleEmail } });

      if (!user) {
        const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
        const nombre = nameParts[0] || "Usuario";
        const apellido = nameParts.slice(1).join(" ") || "Google";
        const randomPassword = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = await Usuario.create({
          nombre,
          apellido,
          email: googleEmail,
          contrasena: hashedPassword,
          telefono: null,
          id_rol: 2,
          estado: true,
        });
      }

      const token = jwt.sign(
        {
          id: user.id_usuario,
          email: user.email,
          rol: user.id_rol,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "8h" }
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      // Redirigir al callback del frontend con el token
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error("Error en Google callback:", error);
      res.status(500).json({ message: "Error autenticando con Google" });
    }
  }
);

export default router;

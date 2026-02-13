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

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    
    // Devolver una página HTML que guarda el token y redirija
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autenticando...</title>
        </head>
        <body>
          <script>
            // Guardar token en localStorage
            localStorage.setItem('token', '${token}');
            // Redirigir al dashboard
            window.location.href = '${frontendUrl}/dashboard';
          </script>
          <p>Redirigiendo...</p>
        </body>
      </html>
    `);
  }
);

export default router;

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Interfaz personalizada para extender Request
interface CustomRequest extends Request {
  userId?: number;
  rol?: string;
}

// Middleware para verificar el token JWT en las rutas protegidas
export const verifyToken = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    // IMPORTANTE: Verifica qué campos tiene el token
    // Puede ser id_usuario en lugar de id
    const userId = decoded.id || decoded.id_usuario;
    const userRol = decoded.rol || decoded.id_rol;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Token inválido - falta ID de usuario" });
    }

    // Guarda los datos del usuario en req.user
    (req as any).user = {
      id: userId,
      rol: userRol,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
};

import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import Usuario from "../models/User";

interface CustomRequest extends Request {
  userId?: number;
  rol?: string;
}

const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
};

const attachUserFromToken = (req: Request, token: string): boolean => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

  const userId = decoded.id || decoded.id_usuario;
  const userRol = decoded.rol || decoded.id_rol;

  if (!userId) {
    return false;
  }

  (req as any).user = {
    id: userId,
    rol: userRol,
  };

  return true;
};

export const verifyToken = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(403).json({ message: "Token requerido" });
  }

  try {
    const userAttached = attachUserFromToken(req, token);
    if (!userAttached) {
      return res.status(401).json({ message: "Token invalido - falta ID de usuario" });
    }

    const userId = (req as any).user?.id;
    const user = await Usuario.findByPk(userId, {
      attributes: ["id_usuario", "estado"],
    });

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    if (!user.estado) {
      return res.status(403).json({
        message:
          "Tu cuenta esta inactiva. Contacta al administrador para reactivarla.",
      });
    }

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token invalido o expirado" });
  }
};

export const optionalVerifyToken = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next();
  }

  try {
    attachUserFromToken(req, token);
  } catch (_error) {
    // Las vistas publicas no deben fallar por un token vencido o malformado.
  }

  return next();
};

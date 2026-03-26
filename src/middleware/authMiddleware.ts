import { NextFunction, Request, Response } from "express";
import Usuario from "../models/User";
import { AppError } from "../utils/appError";
import {
  attachRequestUserFromToken,
  extractBearerToken,
} from "../services/auth/authSessionService";

export const verifyToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(new AppError(403, "Token requerido"));
    return;
  }

  try {
    const userAttached = attachRequestUserFromToken(req, token);
    if (!userAttached) {
      next(new AppError(401, "Token invalido - falta ID de usuario"));
      return;
    }

    const user = await Usuario.findByPk(req.user?.id, {
      attributes: ["id_usuario", "estado"],
    });

    if (!user) {
      next(new AppError(401, "Usuario no encontrado"));
      return;
    }

    if (!user.estado) {
      next(
        new AppError(
          403,
          "Tu cuenta esta inactiva. Contacta al administrador para reactivarla."
        )
      );
      return;
    }

    next();
  } catch {
    next(new AppError(401, "Token invalido o expirado"));
  }
};

export const optionalVerifyToken = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    attachRequestUserFromToken(req, token);
  } catch {
    // Las vistas publicas no deben fallar por un token vencido o malformado.
  }

  next();
};

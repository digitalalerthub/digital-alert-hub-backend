import { NextFunction, Request, Response } from "express";
import Usuario from "../models/users/User";
import { AppError } from "../utils/appError";
import {
  attachRequestUserFromToken,
  extractRequestToken,
} from "../services/auth/authSessionService";
import { getRoleNameForToken } from "../utils/roleUtils";

export const verifyToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = extractRequestToken(req);

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
      attributes: ["id_usuario", "estado", "id_rol", "email", "session_version"],
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

    const tokenSessionVersion =
      Number.isInteger(req.user?.session_version) &&
      req.user?.session_version !== undefined
        ? Number(req.user.session_version)
        : 0;
    const currentSessionVersion = user.session_version ?? 0;

    if (currentSessionVersion !== tokenSessionVersion) {
      next(new AppError(401, "Sesion revocada o expirada"));
      return;
    }

    req.user = {
      ...req.user,
      id: user.id_usuario,
      email: user.email,
      rol: user.id_rol,
      role_name: await getRoleNameForToken(user.id_rol),
      session_version: currentSessionVersion,
    };

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
  const token = extractRequestToken(req);

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

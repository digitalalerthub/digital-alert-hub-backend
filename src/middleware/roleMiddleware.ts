import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";
import { isAdminRoleName, resolveCanonicalRoleName } from "../utils/roleUtils";

export const isAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const user = req.user;

  if (!user) {
    next(new AppError(401, "No autenticado"));
    return;
  }

  try {
    const canonicalRoleName = await resolveCanonicalRoleName(
      user.rol,
      user.role_name
    );

    if (!isAdminRoleName(canonicalRoleName)) {
      next(new AppError(403, "No tienes permisos de administrador"));
      return;
    }

    next();
  } catch (error) {
    console.error("Error validando rol admin:", error);
    next(new AppError(500, "Error validando permisos"));
  }
};

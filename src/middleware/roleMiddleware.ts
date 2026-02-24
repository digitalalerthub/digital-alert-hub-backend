import { Request, Response, NextFunction } from "express";
import Rol from "../models/Role";

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    // Validar por nombre de rol evita depender de un id fijo distinto por entorno.
    const role = await Rol.findByPk(user.rol);
    const roleName = String((role as any)?.nombre_rol || "").toLowerCase().trim();
    const esAdmin = roleName === "admin" || roleName === "administrador";

    if (!esAdmin) {
      return res
        .status(403)
        .json({ message: "No tienes permisos de administrador" });
    }

    next();
  } catch (error) {
    console.error("Error validando rol admin:", error);
    res.status(500).json({ message: "Error validando permisos" });
  }
};

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
    const roleId = Number(user.rol);

    // Fallback por id 1 (usado por el frontend actual) y validación flexible por nombre.
    const role = Number.isNaN(roleId) ? null : await Rol.findByPk(roleId);
    const roleName = String((role as any)?.nombre_rol || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const esAdminPorNombre =
      roleName === "admin" ||
      roleName === "administrador" ||
      roleName.includes("admin");

    const esAdminPorId = roleId === 1;
    const esAdmin = esAdminPorNombre || esAdminPorId;

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

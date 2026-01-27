// 
import { Request, Response, NextFunction } from "express";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  // Ajusta el número según tu tabla de roles (ej: 1 = admin)
  const esAdmin = user.rol === 1;

  if (!esAdmin) {
    return res.status(403).json({ message: "No tienes permisos de administrador" });
  }

  next();
};

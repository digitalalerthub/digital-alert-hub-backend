import jwt, { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import { AppError } from "../../utils/appError";
import { RequestAuthUser } from "../../types/auth";

export const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
};

export const decodeRequestUserFromToken = (
  token: string
): RequestAuthUser | null => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

  const userId = decoded.id || decoded.id_usuario;
  const userRol = decoded.rol ?? decoded.id_rol;
  const userRoleName =
    decoded.role_name ?? (typeof decoded.rol === "string" ? decoded.rol : null);

  if (!userId) {
    return null;
  }

  return {
    id: Number(userId),
    rol: userRol,
    role_name: typeof userRoleName === "string" ? userRoleName : userRoleName ?? null,
  };
};

export const attachRequestUserFromToken = (
  req: Request,
  token: string
): RequestAuthUser | null => {
  const user = decodeRequestUserFromToken(token);
  if (!user) {
    return null;
  }

  req.user = user;
  return user;
};

export const requireRequestUser = (req: Request): RequestAuthUser => {
  if (!req.user) {
    throw new AppError(401, "No autenticado");
  }

  return req.user;
};

import jwt, { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import Usuario from "../../models/users/User";
import { AppError } from "../../utils/appError";
import { RequestAuthUser } from "../../types/auth";

const AUTH_COOKIE_NAME = "digital_alert_hub_session";

export const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
};

const extractCookieToken = (cookieHeader?: string): string | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = cookie.slice(0, separatorIndex).trim();
    if (key !== AUTH_COOKIE_NAME) continue;

    const value = cookie.slice(separatorIndex + 1).trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
};

export const extractRequestToken = (req: Request): string | null =>
  extractBearerToken(req.headers.authorization) ||
  extractCookieToken(req.headers.cookie);

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
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    rol: userRol,
    role_name: typeof userRoleName === "string" ? userRoleName : userRoleName ?? null,
    session_version:
      Number.isInteger(decoded.session_version) && decoded.session_version !== undefined
        ? Number(decoded.session_version)
        : 0,
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

export const getAuthCookieName = (): string => AUTH_COOKIE_NAME;

export const revokeRequestSession = async (req: Request): Promise<void> => {
  const token = extractRequestToken(req);
  if (!token) return;

  try {
    const user = decodeRequestUserFromToken(token);
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) return;

    const dbUser = await Usuario.findByPk(userId, {
      attributes: ["id_usuario", "session_version"],
    });
    if (!dbUser) return;

    const tokenSessionVersion =
      Number.isInteger(user?.session_version) && user?.session_version !== undefined
        ? Number(user.session_version)
        : 0;
    const currentSessionVersion = dbUser.session_version ?? 0;

    if (currentSessionVersion !== tokenSessionVersion) return;

    await dbUser.update({
      session_version: currentSessionVersion + 1,
    });
  } catch {
    // Logout debe limpiar la cookie incluso si el token ya no es valido.
  }
};

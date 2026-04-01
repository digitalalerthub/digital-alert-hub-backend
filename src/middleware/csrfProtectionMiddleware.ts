import { NextFunction, Request, Response } from "express";
import { isAllowedCorsOrigin, resolveAllowedCorsOrigins } from "../config/securityConfig";
import { extractBearerToken, getAuthCookieName } from "../services/auth/authSessionService";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const parseCookieValue = (
  cookieHeader: string | undefined,
  cookieName: string
): string | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = cookie.slice(0, separatorIndex).trim();
    if (key !== cookieName) continue;

    const value = cookie.slice(separatorIndex + 1).trim();
    return value || null;
  }

  return null;
};

const resolveOriginFromRequest = (req: Request): string | undefined => {
  const originHeader =
    typeof req.headers.origin === "string" ? req.headers.origin.trim() : "";
  if (originHeader) {
    return originHeader;
  }

  const refererHeader =
    typeof req.headers.referer === "string" ? req.headers.referer.trim() : "";
  if (!refererHeader) {
    return undefined;
  }

  try {
    return new URL(refererHeader).origin;
  } catch {
    return undefined;
  }
};

export const csrfOriginProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const hasBearerToken = Boolean(extractBearerToken(req.headers.authorization));
  const hasSessionCookie = Boolean(
    parseCookieValue(req.headers.cookie, getAuthCookieName())
  );

  if (!hasSessionCookie || hasBearerToken) {
    next();
    return;
  }

  const allowedOrigins = resolveAllowedCorsOrigins();
  const requestOrigin = resolveOriginFromRequest(req);

  if (!requestOrigin || !isAllowedCorsOrigin(requestOrigin, allowedOrigins)) {
    res.status(403).json({ message: "Origen no permitido para esta operacion" });
    return;
  }

  next();
};

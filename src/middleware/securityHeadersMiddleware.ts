import { NextFunction, Request, Response } from "express";

const API_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

export const applySecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");

  if (!req.path.startsWith("/api/docs")) {
    res.setHeader("Content-Security-Policy", API_CONTENT_SECURITY_POLICY);
  }

  next();
};

export const SWAGGER_DOCS_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "font-src 'self' https://unpkg.com data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

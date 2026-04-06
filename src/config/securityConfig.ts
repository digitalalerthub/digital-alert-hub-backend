import type { Request } from "express";

const parseBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/+$/, "");

const DEFAULT_REQUEST_BODY_LIMIT = "100kb";
const DEFAULT_SLOW_REQUEST_THRESHOLD_MS = 1000;
const DEFAULT_AUTH_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

type AuthCookieSameSite = "lax" | "strict" | "none";

const parsePositiveInteger = (value: string | undefined): number | null => {
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseSameSite = (
  value: string | undefined
): AuthCookieSameSite | null => {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "lax" || normalized === "strict" || normalized === "none") {
    return normalized;
  }

  return null;
};

const isSecureRequest = (
  req?: Pick<Request, "secure" | "headers">
): boolean => {
  if (!req) return false;
  if (req.secure) return true;

  const forwardedProto =
    typeof req.headers?.["x-forwarded-proto"] === "string"
      ? req.headers["x-forwarded-proto"]
      : "";

  return forwardedProto
    .split(",")
    .some((value) => value.trim().toLowerCase() === "https");
};

export const resolveAllowedCorsOrigins = (): string[] => {
  const rawOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  if (rawOrigins.length > 0) {
    return Array.from(new Set(rawOrigins));
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173"];
  }

  return [];
};

export const resolveAuthCookieOptions = (
  req?: Pick<Request, "secure" | "headers">
) => {
  const configuredSecure = parseBoolean(process.env.AUTH_COOKIE_SECURE);
  const configuredSameSite = parseSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  const configuredMaxAge =
    parsePositiveInteger(process.env.AUTH_COOKIE_MAX_AGE_MS) ??
    DEFAULT_AUTH_COOKIE_MAX_AGE_MS;
  const configuredDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

  const requestIsSecure = isSecureRequest(req);
  const secure =
    configuredSecure ??
    (requestIsSecure || process.env.NODE_ENV === "production");
  const sameSite = configuredSameSite ?? (secure ? "none" : "lax");

  return {
    httpOnly: true as const,
    sameSite,
    secure: sameSite === "none" ? true : secure,
    path: "/",
    maxAge: configuredMaxAge,
    ...(configuredDomain ? { domain: configuredDomain } : {}),
  };
};

export const isAllowedCorsOrigin = (
  origin: string | undefined,
  allowedOrigins: string[]
): boolean => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.includes(normalizedOrigin);
};

export const isApiDocsEnabled = (): boolean => {
  const explicitValue = parseBoolean(process.env.API_DOCS_ENABLED);
  if (explicitValue !== null) {
    return explicitValue;
  }

  return process.env.NODE_ENV !== "production";
};

export const resolveRequestBodyLimit = (): string => {
  const configuredLimit = process.env.REQUEST_BODY_LIMIT?.trim();
  return configuredLimit || DEFAULT_REQUEST_BODY_LIMIT;
};

export const resolveSlowRequestThresholdMs = (): number => {
  const configuredThreshold = Number(process.env.SLOW_REQUEST_THRESHOLD_MS);

  if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
    return configuredThreshold;
  }

  return DEFAULT_SLOW_REQUEST_THRESHOLD_MS;
};

export const isResponseTimingEnabled = (): boolean => {
  const explicitValue = parseBoolean(process.env.RESPONSE_TIMING_ENABLED);
  if (explicitValue !== null) {
    return explicitValue;
  }

  return true;
};

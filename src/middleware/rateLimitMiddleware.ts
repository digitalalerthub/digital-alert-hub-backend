import { NextFunction, Request, Response } from "express";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type IpRateLimiterOptions = {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
};

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 10;

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || req.ip || "unknown";
  }

  return req.ip || "unknown";
};

const buildRateLimitHeaders = (
  res: Response,
  max: number,
  remaining: number,
  resetAt: number
) => {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  res.setHeader("Retry-After", String(retryAfterSeconds));
};

export const createIpRateLimiter = ({
  windowMs,
  max,
  message,
  keyPrefix,
}: IpRateLimiterOptions) => {
  const bucketWindowMs = windowMs > 0 ? windowMs : DEFAULT_WINDOW_MS;
  const bucketMax = max > 0 ? max : DEFAULT_MAX_REQUESTS;
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const clientIp = getClientIp(req);
    const bucketKey = `${keyPrefix}:${clientIp}`;
    const currentBucket = buckets.get(bucketKey);

    if (!currentBucket || currentBucket.resetAt <= now) {
      const freshBucket: RateLimitBucket = {
        count: 1,
        resetAt: now + bucketWindowMs,
      };

      buckets.set(bucketKey, freshBucket);
      buildRateLimitHeaders(res, bucketMax, Math.max(bucketMax - 1, 0), freshBucket.resetAt);
      next();
      return;
    }

    currentBucket.count += 1;
    buckets.set(bucketKey, currentBucket);

    if (currentBucket.count > bucketMax) {
      buildRateLimitHeaders(res, bucketMax, 0, currentBucket.resetAt);
      res.status(429).json({ message });
      return;
    }

    buildRateLimitHeaders(
      res,
      bucketMax,
      Math.max(bucketMax - currentBucket.count, 0),
      currentBucket.resetAt
    );
    next();
  };
};

const authRateLimitWindowMs = parsePositiveInteger(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  DEFAULT_WINDOW_MS
);

export const loginRateLimiter = createIpRateLimiter({
  windowMs: authRateLimitWindowMs,
  max: parsePositiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 10),
  message: "Demasiados intentos de inicio de sesion. Intenta nuevamente mas tarde.",
  keyPrefix: "auth-login",
});

export const registerRateLimiter = createIpRateLimiter({
  windowMs: authRateLimitWindowMs,
  max: parsePositiveInteger(process.env.AUTH_REGISTER_RATE_LIMIT_MAX, 5),
  message: "Demasiados intentos de registro. Intenta nuevamente mas tarde.",
  keyPrefix: "auth-register",
});

export const forgotPasswordRateLimiter = createIpRateLimiter({
  windowMs: authRateLimitWindowMs,
  max: parsePositiveInteger(process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX, 5),
  message: "Demasiadas solicitudes de recuperacion. Intenta nuevamente mas tarde.",
  keyPrefix: "auth-forgot-password",
});

export const resendVerificationRateLimiter = createIpRateLimiter({
  windowMs: authRateLimitWindowMs,
  max: parsePositiveInteger(process.env.AUTH_RESEND_VERIFICATION_RATE_LIMIT_MAX, 5),
  message: "Demasiadas solicitudes de verificacion. Intenta nuevamente mas tarde.",
  keyPrefix: "auth-resend-verification",
});

export const resetPasswordRateLimiter = createIpRateLimiter({
  windowMs: authRateLimitWindowMs,
  max: parsePositiveInteger(process.env.AUTH_RESET_PASSWORD_RATE_LIMIT_MAX, 10),
  message: "Demasiados intentos de restablecer la contrasena. Intenta nuevamente mas tarde.",
  keyPrefix: "auth-reset-password",
});

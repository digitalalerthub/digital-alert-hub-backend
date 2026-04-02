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

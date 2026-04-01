const parseBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/+$/, "");

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

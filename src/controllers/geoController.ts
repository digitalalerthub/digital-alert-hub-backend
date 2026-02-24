import { Request, Response } from "express";

type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
};

type NominatimReverseResult = {
  display_name?: string;
  address?: {
    road?: string;
    residential?: string;
    neighbourhood?: string;
    suburb?: string;
  };
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const DEFAULT_CITY_HINT = "Medellin, Antioquia, Colombia";
const GEO_CACHE_TTL_MS = 5 * 60 * 1000;

type SearchPayload = {
  query: string;
  usedQuery?: string;
  results: Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
};

type ReversePayload = NominatimReverseResult;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const searchCache = new Map<string, CacheEntry<SearchPayload>>();
const reverseCache = new Map<string, CacheEntry<ReversePayload>>();
const MEDELLIN_CENTER = { lat: 6.2442, lon: -75.5812 };

const getFromCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const saveToCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + GEO_CACHE_TTL_MS,
  });
};

const buildAddressVariants = (raw: string): string[] => {
  const clean = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*#\s*/g, " # ")
    .trim();

  const noHash = clean.replace(/\s*#\s*/g, " ");
  const withNo = clean.replace(/\s*#\s*/g, " No ");
  const noCommas = withNo.replace(/,/g, " ");
  const hyphenNormalized = clean.replace(/\s*-\s*/g, "-");
  const noHashHyphen = hyphenNormalized.replace(/\s*#\s*/g, " ");
  const withNoHyphen = hyphenNormalized.replace(/\s*#\s*/g, " No ");
  const numberSeparated = withNoHyphen.replace(/(\d+)-(\d+)/g, "$1 $2");

  const candidates = [
    clean,
    hyphenNormalized,
    withNo,
    withNoHyphen,
    noHash,
    noHashHyphen,
    noCommas,
    numberSeparated,
    `${withNo}, ${DEFAULT_CITY_HINT}`,
    `${noHash}, ${DEFAULT_CITY_HINT}`,
    `${hyphenNormalized}, ${DEFAULT_CITY_HINT}`,
    `${withNoHyphen}, ${DEFAULT_CITY_HINT}`,
    `${noHashHyphen}, ${DEFAULT_CITY_HINT}`,
    `${numberSeparated}, ${DEFAULT_CITY_HINT}`,
    `${clean}, Medellin, Colombia`,
    `${clean}, Medellín, Colombia`,
    `${withNo}, Colombia`,
  ]
    .map((q) => q.trim().replace(/\s+/g, " "))
    .filter((q) => q.length >= 3);

  return Array.from(new Set(candidates));
};

const getHeaders = () => ({
  "User-Agent": "DigitalAlertHub/1.0 (contacto: digitalalerthub@gmail.com)",
  "Accept-Language": "es",
});

const parseLimit = (limitRaw: unknown): number => {
  const n = Number(limitRaw);
  if (Number.isNaN(n)) return 5;
  return Math.max(1, Math.min(10, n));
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractAlphaTokens = (value: string): string[] =>
  normalizeText(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && /[a-z]/.test(t));

const extractNumericTokens = (value: string): string[] =>
  normalizeText(value)
    .split(/[\s#-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && /^\d+[a-z]?$/.test(t));

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const scoreSearchResult = (
  result: NominatimSearchResult,
  query: string,
  strict: boolean
): number => {
  const dn = normalizeText(result.display_name || "");
  const qn = normalizeText(query);
  const alphaTokens = extractAlphaTokens(query);
  const numericTokens = extractNumericTokens(query);

  let score = (result.importance || 0) * 100;

  if (dn.includes("medellin")) score += 60;
  if (dn.includes("antioquia")) score += 24;
  if (dn.includes("bogota") && !qn.includes("bogota")) score -= 40;

  for (const token of alphaTokens) {
    if (dn.includes(token)) score += 8;
  }

  for (const token of numericTokens) {
    if (dn.includes(token)) score += 16;
  }

  const queryNoSpaces = qn.replace(/\s+/g, "");
  const displayNoSpaces = dn.replace(/\s+/g, "");
  if (queryNoSpaces.length >= 6 && displayNoSpaces.includes(queryNoSpaces)) {
    score += 55;
  }

  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
    const km = distanceKm(lat, lon, MEDELLIN_CENTER.lat, MEDELLIN_CENTER.lon);
    // Acerca resultados al valle de aburra si no hay ciudad explicita.
    const proximityBonus = Math.max(0, 35 - km);
    score += proximityBonus;
  }

  if (strict) {
    if (!dn.includes("medellin")) score -= 25;
    if (numericTokens.length > 0) {
      const matchedNums = numericTokens.filter((n) => dn.includes(n)).length;
      if (matchedNums === 0) score -= 20;
    }
  }

  return score;
};

export const searchAddress = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Parametro q requerido" });
    }

    const limit = parseLimit(req.query.limit);
    const strict = String(req.query.strict || "").toLowerCase() === "true";
    const variantsBase = strict
      ? Array.from(new Set([query, `${query}, ${DEFAULT_CITY_HINT}`]))
      : buildAddressVariants(query);
    const variants = variantsBase.slice(0, strict ? 2 : 8);

    const cacheKey = `search:${query.toLowerCase()}:limit=${limit}:strict=${strict}`;
    const cached = getFromCache(searchCache, cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const collected: Array<NominatimSearchResult & { usedQuery: string; score: number }> = [];

    for (const variant of variants) {
      const url = new URL(`${NOMINATIM_BASE}/search`);
      url.searchParams.set("q", variant);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("countrycodes", "co");
      url.searchParams.set("dedupe", "1");
      url.searchParams.set("limit", String(limit));
      // Sesgo a Medellin sin bloquear otros resultados.
      url.searchParams.set("viewbox", "-75.73,6.34,-75.47,6.14");
      url.searchParams.set("bounded", strict ? "1" : "0");
      url.searchParams.set("accept-language", "es");

      const response = await fetch(url.toString(), { headers: getHeaders() });
      if (response.status === 429) {
        continue;
      }
      if (!response.ok) continue;

      const data = (await response.json()) as NominatimSearchResult[];
      if (!Array.isArray(data) || data.length === 0) continue;

      for (const item of data) {
        collected.push({
          ...item,
          usedQuery: variant,
          score: scoreSearchResult(item, query, strict),
        });
      }
    }

    if (collected.length > 0) {
      const dedupedMap = new Map<string, (typeof collected)[number]>();
      for (const item of collected) {
        const key = `${item.lat},${item.lon}`;
        const existing = dedupedMap.get(key);
        if (!existing || item.score > existing.score) {
          dedupedMap.set(key, item);
        }
      }

      const ordered = Array.from(dedupedMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      const payload: SearchPayload = {
        query,
        usedQuery: ordered[0]?.usedQuery,
        results: ordered.map((r) => ({
          display_name: r.display_name,
          lat: r.lat,
          lon: r.lon,
        })),
      };
      saveToCache(searchCache, cacheKey, payload);
      return res.json(payload);
    }

    const emptyPayload: SearchPayload = { query, results: [] };
    saveToCache(searchCache, cacheKey, emptyPayload);
    return res.json(emptyPayload);
  } catch (error) {
    console.error("Error en busqueda de direcciones:", error);
    res.status(500).json({ message: "Error buscando direcciones" });
  }
};

export const reverseAddress = async (req: Request, res: Response) => {
  try {
    const lat = String(req.query.lat || "").trim();
    const lon = String(req.query.lon || "").trim();

    if (!lat || !lon) {
      return res.status(400).json({ message: "Parametros lat y lon requeridos" });
    }

    const cacheKey = `reverse:${lat},${lon}`;
    const cached = getFromCache(reverseCache, cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const zooms = ["18", "17", "16", "15", "14"];
    for (const zoom of zooms) {
      const url = new URL(`${NOMINATIM_BASE}/reverse`);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", lat);
      url.searchParams.set("lon", lon);
      url.searchParams.set("zoom", zoom);
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", "es");

      const response = await fetch(url.toString(), { headers: getHeaders() });
      if (response.status === 429) {
        continue;
      }
      if (!response.ok) continue;

      const data = (await response.json()) as NominatimReverseResult;
      const address = data.address || {};
      const hasUsefulAddress =
        Boolean(address.road) ||
        Boolean(address.residential) ||
        Boolean(address.neighbourhood) ||
        Boolean(address.suburb) ||
        Boolean(data.display_name);

      if (hasUsefulAddress) {
        saveToCache(reverseCache, cacheKey, data);
        return res.json(data);
      }
    }

    return res.status(404).json({ message: "No se encontro direccion para ese punto" });
  } catch (error) {
    console.error("Error en geocodificacion inversa:", error);
    res.status(500).json({ message: "Error obteniendo direccion" });
  }
};

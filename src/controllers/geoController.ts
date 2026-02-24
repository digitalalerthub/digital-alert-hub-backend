import { Request, Response } from "express";

type GeoapifyResult = {
  formatted?: string;
  lat?: number | string;
  lon?: number | string;
  street?: string;
  housenumber?: string;
  suburb?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
};

type GeoapifyResponse = {
  results?: GeoapifyResult[];
  features?: Array<{
    properties?: GeoapifyResult;
  }>;
};

type SearchPayload = {
  query: string;
  usedQuery?: string;
  results: Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
};

type ReversePayload = {
  display_name?: string;
  address?: {
    road?: string;
    residential?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type Candidate = {
  display_name: string;
  lat: string;
  lon: string;
  usedQuery: string;
  score: number;
};

const GEOAPIFY_BASE = "https://api.geoapify.com/v1/geocode";
const DEFAULT_CITY_HINT = "Medellin, Antioquia, Colombia";
const GEO_CACHE_TTL_MS = 5 * 60 * 1000;
const MEDELLIN_CENTER = { lat: 6.2442, lon: -75.5812 };

const searchCache = new Map<string, CacheEntry<SearchPayload>>();
const reverseCache = new Map<string, CacheEntry<ReversePayload>>();

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
  const withNoHyphen = hyphenNormalized.replace(/\s*#\s*/g, " No ");
  const carreraMatch = clean.match(
    /(?:^|\s)(?:carrera|cra|kr|cr)\s*([0-9]+[a-z]?)\s*#\s*([0-9]+[a-z]?)/i
  );
  const calleMatch = clean.match(/(?:^|\s)(?:calle|cl)\s*([0-9]+[a-z]?)\s*#\s*([0-9]+[a-z]?)/i);

  const intersectionVariants: string[] = [];
  if (carreraMatch) {
    const cra = carreraMatch[1].toUpperCase();
    const cl = carreraMatch[2].toUpperCase();
    intersectionVariants.push(`Carrera ${cra} con Calle ${cl}`);
  }
  if (calleMatch) {
    const cl = calleMatch[1].toUpperCase();
    const cra = calleMatch[2].toUpperCase();
    intersectionVariants.push(`Calle ${cl} con Carrera ${cra}`);
  }

  const candidates = [
    clean,
    hyphenNormalized,
    withNo,
    noHash,
    noCommas,
    withNoHyphen,
    `${clean}, ${DEFAULT_CITY_HINT}`,
    `${withNo}, ${DEFAULT_CITY_HINT}`,
    `${clean}, Medellin, Colombia`,
    `${clean}, Colombia`,
    ...intersectionVariants,
    ...intersectionVariants.map((q) => `${q}, ${DEFAULT_CITY_HINT}`),
    ...intersectionVariants.map((q) => `${q}, Medellin, Colombia`),
  ]
    .map((q) => q.trim().replace(/\s+/g, " "))
    .filter((q) => q.length >= 3);

  return Array.from(new Set(candidates));
};

const extractGeoapifyResults = (payload: GeoapifyResponse): GeoapifyResult[] => {
  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (!Array.isArray(payload.features)) {
    return [];
  }

  return payload.features
    .map((feature) => feature.properties)
    .filter((properties): properties is GeoapifyResult => Boolean(properties));
};

const buildDisplayName = (item: GeoapifyResult): string => {
  if (item.formatted && item.formatted.trim()) return item.formatted.trim();

  const street = item.street?.trim() || "";
  const house = item.housenumber?.trim() || "";
  const sector = item.suburb?.trim() || item.district?.trim() || "";
  const city =
    item.city?.trim() ||
    item.town?.trim() ||
    item.village?.trim() ||
    item.municipality?.trim() ||
    "";

  const streetPart = [street, house ? `# ${house}` : ""].filter(Boolean).join(" ").trim();
  const parts = [streetPart, sector, city].filter(Boolean);
  return parts.join(", ");
};

const normalizeSearchResult = (
  item: GeoapifyResult
): { display_name: string; lat: string; lon: string } | null => {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    display_name: buildDisplayName(item),
    lat: String(lat),
    lon: String(lon),
  };
};

const scoreSearchResult = (
  result: { display_name: string; lat: string; lon: string },
  query: string,
  strict: boolean
): number => {
  const dn = normalizeText(result.display_name || "");
  const qn = normalizeText(query);
  const alphaTokens = extractAlphaTokens(query);
  const numericTokens = extractNumericTokens(query);

  let score = 0;

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
    score += Math.max(0, 35 - km);
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

const buildGeoapifyUrl = (
  endpoint: "search" | "autocomplete" | "reverse",
  params: Record<string, string>
): URL => {
  const apiKey = process.env.GEOAPIFY_API_KEY || "";
  const url = new URL(`${GEOAPIFY_BASE}/${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "es");
  url.searchParams.set("apiKey", apiKey);
  return url;
};

const mapToReversePayload = (item: GeoapifyResult): ReversePayload => {
  const city = item.city || item.town || item.village || item.municipality;
  return {
    display_name: buildDisplayName(item),
    address: {
      road: item.street,
      residential: item.street,
      pedestrian: item.street,
      house_number: item.housenumber,
      neighbourhood: item.suburb || item.district,
      suburb: item.suburb,
      city_district: item.district,
      city,
      town: item.town || city,
      village: item.village,
      municipality: item.municipality || item.county || item.state,
    },
  };
};

export const searchAddress = async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return res
        .status(503)
        .json({ message: "Falta configurar GEOAPIFY_API_KEY en el backend" });
    }

    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Parametro q requerido" });
    }

    const limit = parseLimit(req.query.limit);
    const providerLimit = Math.max(limit, 6);
    const strict = String(req.query.strict || "").toLowerCase() === "true";
    const variantsBase = strict
      ? Array.from(new Set([query, `${query}, ${DEFAULT_CITY_HINT}`]))
      : buildAddressVariants(query);
    const variants = variantsBase.slice(0, strict ? 2 : 6);

    const cacheKey = `search:${query.toLowerCase()}:limit=${limit}:strict=${strict}`;
    const cached = getFromCache(searchCache, cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const collected: Candidate[] = [];
    const endpoints: Array<"autocomplete" | "search"> = strict
      ? ["autocomplete", "search"]
      : ["search"];

    for (const variant of variants) {
      for (const endpoint of endpoints) {
        const url = buildGeoapifyUrl(endpoint, {
          text: variant,
          limit: String(providerLimit),
          filter: "countrycode:co",
          bias: `proximity:${MEDELLIN_CENTER.lon},${MEDELLIN_CENTER.lat}`,
        });

        const response = await fetch(url.toString());
        if (response.status === 429) {
          continue;
        }
        if (!response.ok) {
          continue;
        }

        const data = (await response.json()) as GeoapifyResponse;
        const items = extractGeoapifyResults(data);
        if (items.length === 0) continue;

        for (const item of items) {
          const normalized = normalizeSearchResult(item);
          if (!normalized) continue;

          collected.push({
            ...normalized,
            usedQuery: variant,
            score: scoreSearchResult(normalized, query, strict),
          });
        }
      }
    }

    if (collected.length === 0) {
      const emptyPayload: SearchPayload = { query, results: [] };
      saveToCache(searchCache, cacheKey, emptyPayload);
      return res.json(emptyPayload);
    }

    const dedupedMap = new Map<string, Candidate>();
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
      results: ordered.map((item) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
      })),
    };

    saveToCache(searchCache, cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    console.error("Error en busqueda de direcciones:", error);
    return res.status(500).json({ message: "Error buscando direcciones" });
  }
};

export const reverseAddress = async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return res
        .status(503)
        .json({ message: "Falta configurar GEOAPIFY_API_KEY en el backend" });
    }

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

    const url = buildGeoapifyUrl("reverse", {
      lat,
      lon,
      limit: "1",
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      return res.status(404).json({ message: "No se encontro direccion para ese punto" });
    }

    const data = (await response.json()) as GeoapifyResponse;
    const item = extractGeoapifyResults(data)[0];
    if (!item) {
      return res.status(404).json({ message: "No se encontro direccion para ese punto" });
    }

    const payload = mapToReversePayload(item);
    saveToCache(reverseCache, cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    console.error("Error en geocodificacion inversa:", error);
    return res.status(500).json({ message: "Error obteniendo direccion" });
  }
};

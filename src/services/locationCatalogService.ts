import Barrio from "../models/Barrio";
import Comuna from "../models/Comuna";

type ArcgisFeature = {
  attributes?: {
    COMUNA?: number;
    BARRIOS_MEDELLIN?: string;
  };
};

type ArcgisResponse = {
  features?: ArcgisFeature[];
};

const OFFICIAL_SOURCE_URL =
  "https://services.arcgis.com/BQTQBNBsmxjF8vus/arcgis/rest/services/P_medellin/FeatureServer/0/query?where=1%3D1&outFields=COMUNA,BARRIOS_MEDELLIN&returnGeometry=false&f=json";

const COMUNA_NAMES: Record<number, string> = {
  1: "Popular",
  2: "Santa Cruz",
  3: "Manrique",
  4: "Aranjuez",
  5: "Castilla",
  6: "Doce de Octubre",
  7: "Robledo",
  8: "Villa Hermosa",
  9: "Buenos Aires",
  10: "La Candelaria",
  11: "Laureles-Estadio",
  12: "La America",
  13: "San Javier",
  14: "El Poblado",
  15: "Guayabal",
  16: "Belen",
};

const isUrbanComuna = (value: number): boolean => value >= 1 && value <= 16;

const normalizeName = (value: string): string => value.trim().replace(/\s+/g, " ");

const fetchOfficialCatalog = async (): Promise<Map<number, string[]>> => {
  const response = await fetch(OFFICIAL_SOURCE_URL);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el catalogo oficial (${response.status})`);
  }

  const payload = (await response.json()) as ArcgisResponse;
  const features = Array.isArray(payload.features) ? payload.features : [];
  const map = new Map<number, Set<string>>();

  for (const feature of features) {
    const comuna = Number(feature.attributes?.COMUNA);
    const rawBarrio = String(feature.attributes?.BARRIOS_MEDELLIN || "");
    const barrio = normalizeName(rawBarrio);

    if (!Number.isInteger(comuna) || !isUrbanComuna(comuna)) continue;
    if (!barrio) continue;

    if (!map.has(comuna)) {
      map.set(comuna, new Set<string>());
    }
    map.get(comuna)?.add(barrio);
  }

  const result = new Map<number, string[]>();
  for (const [comuna, barrios] of map.entries()) {
    result.set(comuna, Array.from(barrios).sort((a, b) => a.localeCompare(b, "es")));
  }

  return result;
};

export const syncLocationCatalog = async (): Promise<void> => {
  let official: Map<number, string[]>;

  try {
    official = await fetchOfficialCatalog();
  } catch (error) {
    console.warn("No se pudo sincronizar comunas/barrios desde la fuente oficial:", error);
    return;
  }

  for (const [id, nombre] of Object.entries(COMUNA_NAMES)) {
    const idComuna = Number(id);
    await Comuna.upsert({ id_comuna: idComuna, nombre });
  }

  for (const [idComuna, barrios] of official.entries()) {
    for (const nombreBarrio of barrios) {
      await Barrio.findOrCreate({
        where: {
          id_comuna: idComuna,
          nombre: nombreBarrio,
        },
        defaults: {
          id_comuna: idComuna,
          nombre: nombreBarrio,
        },
      });
    }
  }
};

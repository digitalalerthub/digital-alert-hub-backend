import Categoria from "../models/catalogs/Categoria";
import { parsePositiveInt } from "./number";

export type CanonicalAlertCategoryName =
  | "infraestructura_urbana"
  | "riesgos_y_emergencias"
  | "seguridad_y_convivencia"
  | "casos_sociales_y_vulnerabilidad"
  | "salud_y_ambiente"
  | "alertas_comunitarias";

const CATEGORY_ALIASES: Record<CanonicalAlertCategoryName, readonly string[]> = {
  infraestructura_urbana: [
    "infraestructura urbana",
    "infraestructura",
    "agua",
    "energia",
    "gas",
    "movilidad",
    "espacio publico",
    "alcantarillado",
    "alumbrado publico",
    "malla vial",
    "servicios publicos",
  ],
  riesgos_y_emergencias: [
    "riesgos y emergencias",
    "riesgo",
    "riesgos",
    "emergencia",
    "emergencias",
  ],
  seguridad_y_convivencia: [
    "seguridad y convivencia",
    "seguridad",
    "convivencia",
  ],
  casos_sociales_y_vulnerabilidad: [
    "casos sociales y vulnerabilidad",
    "casos sociales",
    "social",
    "sociales",
    "vulnerabilidad",
  ],
  salud_y_ambiente: [
    "salud y ambiente",
    "salud",
    "ambiente",
    "aseo",
    "residuos",
  ],
  alertas_comunitarias: [
    "alertas comunitarias",
    "alerta comunitaria",
    "comunitaria",
    "comunitarias",
    "otro",
  ],
};

export const normalizeAlertCategoryName = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

export const toCanonicalAlertCategoryName = (
  value: unknown
): CanonicalAlertCategoryName | null => {
  const normalized = normalizeAlertCategoryName(value);
  if (!normalized) return null;

  for (const [canonicalName, aliases] of Object.entries(CATEGORY_ALIASES) as Array<
    [CanonicalAlertCategoryName, readonly string[]]
  >) {
    if (aliases.includes(normalized)) {
      return canonicalName;
    }
  }

  return null;
};

type CategoriaCatalogRow = {
  id_categoria: number;
  nombre_categoria: string;
};

export const getAlertCategoryCatalog = async (): Promise<CategoriaCatalogRow[]> =>
  (await Categoria.findAll({
    attributes: ["id_categoria", "nombre_categoria"],
    order: [["id_categoria", "ASC"]],
    raw: true,
  })) as CategoriaCatalogRow[];

export const buildAlertCategoryLabelById = (
  categories: Array<{ id_categoria: number; nombre_categoria: string }>
): Record<number, string> =>
  categories.reduce<Record<number, string>>((acc, category) => {
    acc[Number(category.id_categoria)] =
      category.nombre_categoria?.trim() || `Categoria ${category.id_categoria}`;
    return acc;
  }, {});

export const resolveAlertCategoryCatalogRecord = async (
  categoryIdOrName: unknown,
  explicitCategoryName?: unknown
): Promise<{ id_categoria: number; label: string } | null> => {
  const categoryId = parsePositiveInt(categoryIdOrName);
  if (categoryId) {
    const category = await Categoria.findByPk(categoryId, {
      attributes: ["id_categoria", "nombre_categoria"],
    });

    if (!category) {
      return null;
    }

    return {
      id_categoria: category.id_categoria,
      label: category.nombre_categoria?.trim() || `Categoria ${category.id_categoria}`,
    };
  }

  const categoryName =
    typeof explicitCategoryName === "string" ? explicitCategoryName : categoryIdOrName;
  if (typeof categoryName !== "string" || categoryName.trim().length === 0) {
    return null;
  }

  const normalizedCategoryName = normalizeAlertCategoryName(categoryName);
  const catalog = await getAlertCategoryCatalog();

  const directMatch = catalog.find(
    (category) =>
      normalizeAlertCategoryName(category.nombre_categoria) === normalizedCategoryName
  );
  if (directMatch) {
    return {
      id_categoria: Number(directMatch.id_categoria),
      label:
        directMatch.nombre_categoria?.trim() ||
        `Categoria ${Number(directMatch.id_categoria)}`,
    };
  }

  const canonicalName = toCanonicalAlertCategoryName(categoryName);
  if (!canonicalName) {
    return null;
  }

  const canonicalMatch = catalog.find(
    (category) => toCanonicalAlertCategoryName(category.nombre_categoria) === canonicalName
  );
  if (!canonicalMatch) {
    return null;
  }

  return {
    id_categoria: Number(canonicalMatch.id_categoria),
    label:
      canonicalMatch.nombre_categoria?.trim() ||
      `Categoria ${Number(canonicalMatch.id_categoria)}`,
  };
};

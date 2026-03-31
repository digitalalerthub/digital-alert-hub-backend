import Estado from "../models/catalogs/Estado";

export type CanonicalStateName =
  | "pendiente"
  | "en_progreso"
  | "resuelta"
  | "falsa_alerta";

const STATE_ALIASES: Record<CanonicalStateName, readonly string[]> = {
  pendiente: ["pendiente", "nueva"],
  en_progreso: ["en progreso", "en_progreso", "enprogreso"],
  resuelta: ["resuelta", "resuelto"],
  falsa_alerta: ["falsa alerta", "falsa_alerta", "falsaalerta"],
};

export const normalizeStateName = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

export const toCanonicalStateName = (value: unknown): CanonicalStateName | null => {
  const normalized = normalizeStateName(value);
  if (!normalized) return null;

  for (const [canonicalName, aliases] of Object.entries(STATE_ALIASES) as Array<
    [CanonicalStateName, readonly string[]]
  >) {
    if (aliases.includes(normalized)) {
      return canonicalName;
    }
  }

  return null;
};

type EstadoCatalogRow = {
  id_estado: number;
  nombre_estado: string;
};

const getEstadoCatalog = async (): Promise<EstadoCatalogRow[]> =>
  (await Estado.findAll({
    attributes: ["id_estado", "nombre_estado"],
    order: [["id_estado", "ASC"]],
    raw: true,
  })) as EstadoCatalogRow[];

export const resolveStateIdsByCanonicalNames = async (
  stateNames: readonly CanonicalStateName[]
): Promise<Map<CanonicalStateName, number>> => {
  const catalog = await getEstadoCatalog();
  const idsByName = new Map<CanonicalStateName, number>();

  for (const estado of catalog) {
    const canonicalName = toCanonicalStateName(estado.nombre_estado);
    if (!canonicalName || !stateNames.includes(canonicalName)) {
      continue;
    }

    idsByName.set(canonicalName, Number(estado.id_estado));
  }

  return idsByName;
};

export const resolveRequiredStateIds = async <TStateName extends CanonicalStateName>(
  stateNames: readonly TStateName[]
): Promise<Record<TStateName, number> | null> => {
  const idsByName = await resolveStateIdsByCanonicalNames(stateNames);
  const result = {} as Record<TStateName, number>;

  for (const stateName of stateNames) {
    const stateId = idsByName.get(stateName);
    if (!stateId) {
      return null;
    }
    result[stateName] = stateId;
  }

  return result;
};

export const resolveStateIdByCanonicalName = async (
  stateName: CanonicalStateName
): Promise<number | null> => {
  const ids = await resolveRequiredStateIds([stateName]);
  return ids?.[stateName] ?? null;
};

import { Request } from "express";
import Barrio from "../models/catalogs/Barrio";
import { isAdminRoleName, resolveCanonicalRoleName } from "./roleUtils";
import { resolveRequiredStateIds } from "./stateUtils";

const ALERT_WORKFLOW_STATE_NAMES = [
  "pendiente",
  "en_progreso",
  "resuelta",
  "falsa_alerta",
] as const;

const PRIORITY_WEIGHT: Record<string, number> = {
  alta: 3,
  media: 2,
  baja: 1,
};

export const parseOptionalPositiveInt = (value: unknown): number | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

export const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "si";
};

export const parseEvidenceIdsToDelete = (value: unknown): number[] | null => {
  if (value === undefined || value === null || value === "") return [];

  const rawItems: unknown[] = [];
  let invalidInput = false;

  const appendItem = (item: unknown) => {
    if (item === undefined || item === null || item === "") return;

    if (Array.isArray(item)) {
      item.forEach(appendItem);
      return;
    }

    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          appendItem(parsed);
          return;
        } catch {
          invalidInput = true;
          return;
        }
      }

      if (trimmed.includes(",")) {
        trimmed
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach(appendItem);
        return;
      }
    }

    rawItems.push(item);
  };

  appendItem(value);
  if (invalidInput) return null;

  const parsedIds: number[] = [];
  for (const item of rawItems) {
    const n = Number(item);
    if (!Number.isInteger(n) || n <= 0) {
      return null;
    }
    parsedIds.push(n);
  }

  return Array.from(new Set(parsedIds));
};

export const hasRestrictedAlertFieldChanges = (body: Request["body"]): boolean =>
  [
    "titulo",
    "descripcion",
    "categoria",
    "id_categoria",
    "ubicacion",
    "prioridad",
    "id_comuna",
    "id_barrio",
    "evidencias_eliminadas",
  ].some((field) => body[field] !== undefined) || parseBooleanFlag(body.eliminar_todas_evidencias);

export const isValidComunaBarrioPair = async (
  idComuna: number,
  idBarrio: number
): Promise<boolean> => {
  const barrio = await Barrio.findOne({
    where: {
      id_barrio: idBarrio,
      id_comuna: idComuna,
    },
    attributes: ["id_barrio"],
  });

  return Boolean(barrio);
};

export const isRequestAdmin = async (req: Request): Promise<boolean> => {
  const canonicalRoleName = await resolveCanonicalRoleName(
    req.user?.rol,
    req.user?.role_name
  );

  return isAdminRoleName(canonicalRoleName);
};

export const getAlertWorkflowStateIds = async () =>
  resolveRequiredStateIds(ALERT_WORKFLOW_STATE_NAMES);

export const getStatusWeight = (
  idEstado: number,
  workflowStateIds: Record<(typeof ALERT_WORKFLOW_STATE_NAMES)[number], number>
): number => {
  if (idEstado === workflowStateIds.pendiente) return 3;
  if (idEstado === workflowStateIds.en_progreso) return 2;
  if (idEstado === workflowStateIds.resuelta) return 1;
  if (idEstado === workflowStateIds.falsa_alerta) return 0;
  return 0;
};

export const getPriorityWeight = (prioridad?: string | null): number => {
  if (!prioridad) return 0;
  return PRIORITY_WEIGHT[prioridad.trim().toLowerCase()] ?? 0;
};

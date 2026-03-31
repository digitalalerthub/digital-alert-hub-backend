import { Op, WhereOptions } from "sequelize";
import Alerta from "../../models/alerts/Alert";
import Barrio from "../../models/catalogs/Barrio";
import Categoria from "../../models/catalogs/Categoria";
import Comuna from "../../models/catalogs/Comuna";
import Estado from "../../models/catalogs/Estado";
import { resolveAlertCategoryCatalogRecord } from "../../utils/categoryUtils";
import { resolveRequiredStateIds } from "../../utils/stateUtils";

type ReportAlertRow = {
  id_alerta: number;
  id_estado: number;
  id_comuna: number | null;
  id_barrio: number | null;
  id_categoria: number | null;
  created_at: Date;
};

type ReportCatalogRow = {
  created_at: Date;
};

type EstadoCatalogRow = {
  id_estado: number;
  nombre_estado: string;
};

type CategoriaCatalogRow = {
  id_categoria: number;
  nombre_categoria: string;
};

export type MonthRange = {
  value: string;
  start: Date;
  end: Date;
};

export type YearRange = {
  value: number;
  start: Date;
  end: Date;
};

type AlertReportFilters = {
  idEstado?: number;
  idComuna?: number;
  idBarrio?: number;
  year?: YearRange;
  months?: MonthRange[];
  category?: string;
};

export const parsePositiveIntQuery = (value: unknown): number | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const parseYearQuery = (value: unknown): YearRange | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 2000) {
    return null;
  }

  return {
    value: parsed,
    start: new Date(Date.UTC(parsed, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(parsed + 1, 0, 1, 0, 0, 0, 0)),
  };
};

const parseMonthValue = (value: string): MonthRange | null => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;

  const [yearText, monthText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    value: trimmed,
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
  };
};

export const parseMonthsQuery = (value: unknown): MonthRange[] | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;

  const rawItems = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (rawItems.length === 0) return undefined;

  const uniqueItems = Array.from(new Set(rawItems));
  const parsedItems = uniqueItems.map(parseMonthValue);

  if (parsedItems.some((item) => item === null)) {
    return null;
  }

  return (parsedItems as MonthRange[]).sort((a, b) => a.value.localeCompare(b.value));
};

export const parseCategoryQuery = (value: unknown): string | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

const getMonthKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getMonthLabel = (monthKey: string): string => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(Date.UTC(year, month - 1, 1));

  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    timeZone: "UTC",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const buildYearMonthKeys = (yearValue: number): string[] => {
  return Array.from({ length: 12 }, (_, index) =>
    `${yearValue}-${String(index + 1).padStart(2, "0")}`
  );
};

export const getAlertReportData = async ({
  idEstado,
  idComuna,
  idBarrio,
  year,
  months,
  category,
}: AlertReportFilters) => {
  const workflowStateIds = await resolveRequiredStateIds([
    "pendiente",
    "en_progreso",
    "resuelta",
    "falsa_alerta",
  ]);

  if (!workflowStateIds) {
    throw new Error("REPORT_WORKFLOW_NOT_CONFIGURED");
  }

  const where: WhereOptions = {};
  const whereWithOperators = where as WhereOptions & Record<symbol, unknown>;

  if (idEstado !== undefined) {
    where.id_estado = idEstado;
  }

  if (idComuna !== undefined) {
    where.id_comuna = idComuna;
  }

  if (idBarrio !== undefined) {
    where.id_barrio = idBarrio;
  }

  if (category !== undefined) {
    const resolvedCategory = await resolveAlertCategoryCatalogRecord(category);
    where.id_categoria = resolvedCategory?.id_categoria ?? -1;
  }

  const andConditions: WhereOptions[] = [];

  if (year) {
    andConditions.push({
      created_at: {
        [Op.gte]: year.start,
        [Op.lt]: year.end,
      },
    });
  }

  if (months?.length) {
    if (year && months.some((item) => !item.value.startsWith(`${year.value}-`))) {
      throw new Error("REPORT_MONTHS_YEAR_MISMATCH");
    }

    andConditions.push({
      [Op.or]: months.map((item) => ({
        created_at: {
          [Op.gte]: item.start,
          [Op.lt]: item.end,
        },
      })),
    });
  }

  if (andConditions.length > 0) {
    whereWithOperators[Op.and] = andConditions;
  }

  const [alertas, catalogSource, estadoCatalogSource, categoriaCatalogSource] =
    (await Promise.all([
      Alerta.findAll({
        where,
        attributes: ["id_alerta", "id_estado", "id_comuna", "id_barrio", "id_categoria", "created_at"],
        order: [["created_at", "ASC"]],
        raw: true,
      }),
      Alerta.findAll({
        attributes: ["created_at"],
        raw: true,
      }),
      Estado.findAll({
        attributes: ["id_estado", "nombre_estado"],
        order: [["id_estado", "ASC"]],
        raw: true,
      }),
      Categoria.findAll({
        attributes: ["id_categoria", "nombre_categoria"],
        order: [["id_categoria", "ASC"]],
        raw: true,
      }),
    ])) as [ReportAlertRow[], ReportCatalogRow[], EstadoCatalogRow[], CategoriaCatalogRow[]];

  const estadoCatalog = estadoCatalogSource.map((estado) => ({
    id_estado: Number(estado.id_estado),
    label: estado.nombre_estado?.trim() || `Estado ${estado.id_estado}`,
  }));

  const comunaIds = Array.from(
    new Set(
      alertas
        .map((alerta) => alerta.id_comuna)
        .filter((value): value is number => Number.isInteger(value) && Number(value) > 0)
    )
  );

  const barrioIds = Array.from(
    new Set(
      alertas
        .map((alerta) => alerta.id_barrio)
        .filter((value): value is number => Number.isInteger(value) && Number(value) > 0)
    )
  );

  const [comunas, barrios] = await Promise.all([
    comunaIds.length > 0
      ? Comuna.findAll({
          where: { id_comuna: comunaIds },
          attributes: ["id_comuna", "nombre"],
          raw: true,
        })
      : Promise.resolve([]),
    barrioIds.length > 0
      ? Barrio.findAll({
          where: { id_barrio: barrioIds },
          attributes: ["id_barrio", "nombre"],
          raw: true,
        })
      : Promise.resolve([]),
  ]);

  const countsByBarrio = new Map<string, number>();
  const countsByCategoria = new Map<string, number>();
  const countsByEstado = new Map<number, number>();
  const barrioNameById = new Map<number, string>();
  const categoriaNameById = new Map<number, string>();
  const monthKeys = months?.length
    ? months.map((item) => item.value)
    : buildYearMonthKeys(year?.value ?? new Date().getUTCFullYear());
  const monthlyTrend = new Map<string, { total: number; resueltas: number }>();

  for (const barrio of barrios as Array<{ id_barrio: number; nombre: string }>) {
    barrioNameById.set(barrio.id_barrio, barrio.nombre);
  }

  for (const categoria of categoriaCatalogSource) {
    categoriaNameById.set(
      Number(categoria.id_categoria),
      categoria.nombre_categoria?.trim() || `Categoria ${Number(categoria.id_categoria)}`
    );
  }

  for (const monthKey of monthKeys) {
    monthlyTrend.set(monthKey, { total: 0, resueltas: 0 });
  }

  for (const alerta of alertas) {
    const barrioLabel = alerta.id_barrio
      ? barrioNameById.get(alerta.id_barrio) ?? `Barrio ${alerta.id_barrio}`
      : "Sin barrio";
    countsByBarrio.set(barrioLabel, (countsByBarrio.get(barrioLabel) ?? 0) + 1);

    const categoriaLabel = alerta.id_categoria
      ? categoriaNameById.get(alerta.id_categoria) ?? `Categoria ${alerta.id_categoria}`
      : "Sin categoria";
    countsByCategoria.set(categoriaLabel, (countsByCategoria.get(categoriaLabel) ?? 0) + 1);

    countsByEstado.set(alerta.id_estado, (countsByEstado.get(alerta.id_estado) ?? 0) + 1);

    const monthKey = getMonthKey(new Date(alerta.created_at));
    if (!monthlyTrend.has(monthKey)) {
      monthlyTrend.set(monthKey, { total: 0, resueltas: 0 });
    }

    const currentMonth = monthlyTrend.get(monthKey)!;
    currentMonth.total += 1;
    if (alerta.id_estado === workflowStateIds.resuelta) {
      currentMonth.resueltas += 1;
    }
  }

  const categoryCatalog = categoriaCatalogSource
    .map((categoria) => categoria.nombre_categoria?.trim())
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b, "es"));

  const yearCatalog = Array.from(
    new Set(
      catalogSource
        .map((alerta) => new Date(alerta.created_at).getUTCFullYear())
        .filter((value) => Number.isInteger(value))
    )
  ).sort((a, b) => b - a);

  return {
    filters: {
      id_estado: idEstado ?? null,
      id_comuna: idComuna ?? null,
      id_barrio: idBarrio ?? null,
      year: year?.value ?? null,
      months: months?.map((item) => item.value) ?? [],
      category: category ?? null,
    },
    kpis: {
      total: alertas.length,
      porAtender: countsByEstado.get(workflowStateIds.pendiente) ?? 0,
      enProceso: countsByEstado.get(workflowStateIds.en_progreso) ?? 0,
      resueltas: countsByEstado.get(workflowStateIds.resuelta) ?? 0,
      falsasAlertas: countsByEstado.get(workflowStateIds.falsa_alerta) ?? 0,
    },
    charts: {
      alertasPorEstado: estadoCatalog.map(({ id_estado, label }) => ({
        id_estado,
        label,
        total: countsByEstado.get(id_estado) ?? 0,
      })),
      alertasPorBarrio: Array.from(countsByBarrio.entries())
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "es")),
      alertasPorCategoria: Array.from(countsByCategoria.entries())
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "es")),
      tendenciaMensual: Array.from(monthlyTrend.entries())
        .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
        .map(([monthKey, values]) => ({
          month: monthKey,
          label: getMonthLabel(monthKey),
          total: values.total,
          resueltas: values.resueltas,
        })),
    },
    catalogos: {
      estados: estadoCatalog,
      comunas: (comunas as Array<{ id_comuna: number; nombre: string }>)
        .map((comuna) => ({
          id_comuna: comuna.id_comuna,
          nombre: comuna.nombre,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      barrios: (barrios as Array<{ id_barrio: number; nombre: string }>)
        .map((barrio) => ({
          id_barrio: barrio.id_barrio,
          nombre: barrio.nombre,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      categorias: categoryCatalog,
      years: yearCatalog,
    },
    generated_at: new Date().toISOString(),
  };
};

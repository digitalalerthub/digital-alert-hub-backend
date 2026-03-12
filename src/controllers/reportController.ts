import { Request, Response } from "express";
import { Op, WhereOptions } from "sequelize";
import Alerta from "../models/Alert";
import Barrio from "../models/Barrio";
import Comuna from "../models/Comuna";

type ReportAlertRow = {
  id_alerta: number;
  id_estado: number;
  id_comuna: number | null;
  id_barrio: number | null;
  categoria: string;
  created_at: Date;
};

type MonthRange = {
  value: string;
  start: Date;
  end: Date;
};

const ESTADO_LABEL_BY_ID: Record<number, string> = {
  1: "Nueva",
  2: "En Progreso",
  3: "Resuelta",
  4: "Falsa Alerta",
};

const parsePositiveIntQuery = (value: unknown): number | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseMonthQuery = (value: unknown): MonthRange | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;

  const [yearText, monthText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return {
    value: trimmed,
    start,
    end,
  };
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

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const buildRecentMonthKeys = (selectedMonth?: string): string[] => {
  const anchor = selectedMonth
    ? new Date(`${selectedMonth}-01T00:00:00.000Z`)
    : new Date();
  const months: string[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const current = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1));
    months.push(getMonthKey(current));
  }

  return months;
};

export const getAlertReports = async (req: Request, res: Response) => {
  try {
    const userRole = Number((req as any).user?.rol);
    if (userRole !== 1 && userRole !== 3) {
      return res.status(403).json({ message: "No autorizado para consultar reportes" });
    }

    const idEstado = parsePositiveIntQuery(req.query.id_estado);
    const idComuna = parsePositiveIntQuery(req.query.id_comuna);
    const idBarrio = parsePositiveIntQuery(req.query.id_barrio);
    const month = parseMonthQuery(req.query.month);

    if (idEstado === null || idComuna === null || idBarrio === null) {
      return res.status(400).json({
        message: "Los filtros id_estado, id_comuna e id_barrio deben ser enteros positivos",
      });
    }

    if (month === null) {
      return res.status(400).json({
        message: "El filtro month debe usar el formato YYYY-MM",
      });
    }

    const where: WhereOptions = {};

    if (idEstado !== undefined) {
      where.id_estado = idEstado;
    }

    if (idComuna !== undefined) {
      where.id_comuna = idComuna;
    }

    if (idBarrio !== undefined) {
      where.id_barrio = idBarrio;
    }

    if (month) {
      where.created_at = {
        [Op.gte]: month.start,
        [Op.lt]: month.end,
      };
    }

    const alertas = (await Alerta.findAll({
      where,
      attributes: ["id_alerta", "id_estado", "id_comuna", "id_barrio", "categoria", "created_at"],
      order: [["created_at", "ASC"]],
      raw: true,
    })) as ReportAlertRow[];

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
    const monthKeys = buildRecentMonthKeys(month?.value);
    const monthlyTrend = new Map<string, { total: number; resueltas: number }>();

    for (const barrio of barrios as Array<{ id_barrio: number; nombre: string }>) {
      barrioNameById.set(barrio.id_barrio, barrio.nombre);
    }

    for (const monthKey of monthKeys) {
      monthlyTrend.set(monthKey, { total: 0, resueltas: 0 });
    }

    for (const alerta of alertas) {
      const barrioLabel = alerta.id_barrio
        ? barrioNameById.get(alerta.id_barrio) ?? `Barrio ${alerta.id_barrio}`
        : "Sin barrio";
      countsByBarrio.set(barrioLabel, (countsByBarrio.get(barrioLabel) ?? 0) + 1);

      const categoriaLabel = alerta.categoria?.trim() || "Sin categoria";
      countsByCategoria.set(categoriaLabel, (countsByCategoria.get(categoriaLabel) ?? 0) + 1);

      countsByEstado.set(alerta.id_estado, (countsByEstado.get(alerta.id_estado) ?? 0) + 1);

      const monthKey = getMonthKey(new Date(alerta.created_at));
      if (!monthlyTrend.has(monthKey)) {
        monthlyTrend.set(monthKey, { total: 0, resueltas: 0 });
      }

      const currentMonth = monthlyTrend.get(monthKey)!;
      currentMonth.total += 1;
      if (alerta.id_estado === 3) {
        currentMonth.resueltas += 1;
      }
    }

    return res.json({
      filters: {
        id_estado: idEstado ?? null,
        id_comuna: idComuna ?? null,
        id_barrio: idBarrio ?? null,
        month: month?.value ?? null,
      },
      kpis: {
        total: alertas.length,
        porAtender: countsByEstado.get(1) ?? 0,
        enProceso: countsByEstado.get(2) ?? 0,
        resueltas: countsByEstado.get(3) ?? 0,
        falsasAlertas: countsByEstado.get(4) ?? 0,
      },
      charts: {
        alertasPorEstado: Object.entries(ESTADO_LABEL_BY_ID).map(([id, label]) => ({
          id_estado: Number(id),
          label,
          total: countsByEstado.get(Number(id)) ?? 0,
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
        estados: Object.entries(ESTADO_LABEL_BY_ID).map(([id, label]) => ({
          id_estado: Number(id),
          label,
        })),
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
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error al obtener reporte de alertas:", error);
    return res.status(500).json({ message: "Error al obtener reporte de alertas" });
  }
};

import { Request, Response } from "express";
import {
  getAlertReportData,
  parseCategoryQuery,
  parseMonthsQuery,
  parsePositiveIntQuery,
  parseYearQuery,
} from "../../services/reports/reportService";
import { AppError } from "../../utils/appError";
import { resolveCanonicalRoleName } from "../../utils/roleUtils";

export const getAlertReports = async (req: Request, res: Response) => {
  const canonicalRoleName = await resolveCanonicalRoleName(
    req.user?.rol,
    req.user?.role_name
  );

  if (
    canonicalRoleName !== "administrador" &&
    canonicalRoleName !== "ciudadano" &&
    canonicalRoleName !== "jac"
  ) {
    throw new AppError(403, "No autorizado para consultar reportes");
  }

  const idEstado = parsePositiveIntQuery(req.query.id_estado);
  const idComuna = parsePositiveIntQuery(req.query.id_comuna);
  const idBarrio = parsePositiveIntQuery(req.query.id_barrio);
  const year = parseYearQuery(req.query.year);
  const months = parseMonthsQuery(req.query.months);
  const category = parseCategoryQuery(req.query.category);

  if (idEstado === null || idComuna === null || idBarrio === null || year === null) {
    throw new AppError(
      400,
      "Los filtros id_estado, id_comuna, id_barrio y year deben ser validos"
    );
  }

  if (months === null) {
    throw new AppError(
      400,
      "El filtro months debe usar el formato YYYY-MM separado por comas"
    );
  }

  if (category === null) {
    throw new AppError(400, "El filtro category debe ser una cadena valida");
  }

  try {
    const reportData = await getAlertReportData({
      idEstado,
      idComuna,
      idBarrio,
      year,
      months,
      category,
    });

    return res.json(reportData);
  } catch (serviceError) {
    if (
      serviceError instanceof Error &&
      serviceError.message === "REPORT_WORKFLOW_NOT_CONFIGURED"
    ) {
      throw new AppError(
        500,
        "La tabla estados no contiene el workflow requerido para reportes"
      );
    }

    if (
      serviceError instanceof Error &&
      serviceError.message === "REPORT_MONTHS_YEAR_MISMATCH"
    ) {
      throw new AppError(
        400,
        "Los meses seleccionados deben pertenecer al año filtrado"
      );
    }

    throw serviceError;
  }
};

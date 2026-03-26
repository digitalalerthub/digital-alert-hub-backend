import { Request, Response } from "express";
import { updateAlertStatus } from "../../services/alerts/alertStatusService";

/**
 * PATCH /api/alertas/:id/estado
 * Body: { id_estado }
 * Requiere: verifyToken middleware
 * Roles: Administrador y JAC
 */
export const updateAlertaEstado = async (req: Request, res: Response) => {
  const result = await updateAlertStatus(req);
  return res.status(result.statusCode).json(result.body);
};

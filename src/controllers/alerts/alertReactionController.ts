import { Request, Response } from "express";
import {
  listAlertReactionSummary,
  toggleReactionForAlert,
} from "../../services/alerts/alertReactionService";
import { AppError } from "../../utils/appError";
import { parsePositiveInt } from "../../utils/number";

const getRequestUserId = (req: Request): number | null => {
  return parsePositiveInt(req.user?.id);
};

export const listAlertReactions = async (req: Request, res: Response) => {
  const idAlerta = parsePositiveInt(req.params.id);
  if (!idAlerta) {
    throw new AppError(400, "ID de alerta invalido");
  }

  const idUsuario = getRequestUserId(req);
  const summary = await listAlertReactionSummary(idAlerta, idUsuario);
  return res.json(summary);
};

export const toggleAlertReaction = async (req: Request, res: Response) => {
  const idAlerta = parsePositiveInt(req.params.id);
  if (!idAlerta) {
    throw new AppError(400, "ID de alerta invalido");
  }

  const idUsuario = getRequestUserId(req);
  if (!idUsuario) {
    throw new AppError(401, "No autenticado");
  }

  const idReaccion = parsePositiveInt(req.body?.id_reaccion);
  if (!idReaccion) {
    throw new AppError(400, "ID de reaccion invalido");
  }

  const summary = await toggleReactionForAlert(idAlerta, idUsuario, idReaccion);
  return res.json(summary);
};

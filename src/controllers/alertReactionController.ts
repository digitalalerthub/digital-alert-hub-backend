import { Request, Response } from "express";
import { col, fn } from "sequelize";
import Alerta from "../models/Alert";
import AlertReaction from "../models/AlertReaction";
import Reaction from "../models/Reaction";

type ReactionCountRow = {
  id_reaccion: number;
  total: string;
};

type AlertReactionSummary = {
  id_reaccion: number;
  tipo: string;
  descrip_tipo_reaccion: string | null;
  count: number;
  user_reacted: boolean;
};

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const getRequestUserId = (req: Request): number | null => {
  return parsePositiveInt((req as any).user?.id);
};

const buildAlertReactionSummary = async (
  idAlerta: number,
  idUsuario?: number | null
): Promise<AlertReactionSummary[]> => {
  const [catalog, countRowsRaw, myReaction] = await Promise.all([
    Reaction.findAll({
      order: [["id_reaccion", "ASC"]],
      attributes: ["id_reaccion", "tipo", "descrip_tipo_reaccion"],
    }),
    AlertReaction.findAll({
      where: { id_alerta: idAlerta },
      attributes: ["id_reaccion", [fn("COUNT", col("id_alerta_reaccion")), "total"]],
      group: ["id_reaccion"],
      raw: true,
    }),
    idUsuario
      ? AlertReaction.findOne({
          where: {
            id_alerta: idAlerta,
            id_usuario: idUsuario,
          },
          attributes: ["id_reaccion"],
        })
      : Promise.resolve(null),
  ]);
  const counts = countRowsRaw as unknown as ReactionCountRow[];

  const countsMap = new Map<number, number>();
  for (const row of counts) {
    countsMap.set(row.id_reaccion, Number(row.total) || 0);
  }

  const myReactionId = myReaction?.id_reaccion ?? null;

  return catalog.map((reaction) => ({
    id_reaccion: reaction.id_reaccion,
    tipo: reaction.tipo,
    descrip_tipo_reaccion: reaction.descrip_tipo_reaccion ?? null,
    count: countsMap.get(reaction.id_reaccion) ?? 0,
    user_reacted: myReactionId === reaction.id_reaccion,
  }));
};

export const listAlertReactions = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    if (!idAlerta) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const idUsuario = getRequestUserId(req);

    const alertExists = await Alerta.findByPk(idAlerta, {
      attributes: ["id_alerta"],
    });
    if (!alertExists) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    const summary = await buildAlertReactionSummary(idAlerta, idUsuario);
    return res.json(summary);
  } catch (error) {
    console.error("Error al listar reacciones de la alerta:", error);
    return res.status(500).json({ message: "Error al obtener reacciones de la alerta" });
  }
};

export const toggleAlertReaction = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    if (!idAlerta) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const idUsuario = getRequestUserId(req);
    if (!idUsuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const idReaccion = parsePositiveInt(req.body?.id_reaccion);
    if (!idReaccion) {
      return res.status(400).json({ message: "ID de reaccion invalido" });
    }

    const [alertExists, reactionExists] = await Promise.all([
      Alerta.findByPk(idAlerta, { attributes: ["id_alerta"] }),
      Reaction.findByPk(idReaccion, { attributes: ["id_reaccion"] }),
    ]);

    if (!alertExists) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    if (!reactionExists) {
      return res.status(404).json({ message: "Reaccion no encontrada" });
    }

    const existingReaction = await AlertReaction.findOne({
      where: {
        id_alerta: idAlerta,
        id_usuario: idUsuario,
      },
    });

    if (existingReaction) {
      if (existingReaction.id_reaccion === idReaccion) {
        await existingReaction.destroy();
      } else {
        existingReaction.id_reaccion = idReaccion;
        await existingReaction.save();
      }
    } else {
      await AlertReaction.create({
        id_alerta: idAlerta,
        id_usuario: idUsuario,
        id_reaccion: idReaccion,
      });
    }

    const summary = await buildAlertReactionSummary(idAlerta, idUsuario);
    return res.json(summary);
  } catch (error) {
    console.error("Error al registrar reaccion en alerta:", error);
    return res.status(500).json({ message: "Error al registrar reaccion" });
  }
};

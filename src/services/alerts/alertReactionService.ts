import { col, fn } from "sequelize";
import Alerta from "../../models/Alert";
import AlertReaction from "../../models/AlertReaction";
import Reaction from "../../models/Reaction";
import { AppError } from "../../utils/appError";

type ReactionCountRow = {
  id_reaccion: number;
  total: string;
};

export type AlertReactionSummary = {
  id_reaccion: number;
  tipo: string;
  descrip_tipo_reaccion: string | null;
  count: number;
  user_reacted: boolean;
};

const ensureAlertExists = async (idAlerta: number): Promise<void> => {
  const alertExists = await Alerta.findByPk(idAlerta, {
    attributes: ["id_alerta"],
  });

  if (!alertExists) {
    throw new AppError(404, "Alerta no encontrada");
  }
};

const ensureReactionExists = async (idReaccion: number): Promise<void> => {
  const reactionExists = await Reaction.findByPk(idReaccion, {
    attributes: ["id_reaccion"],
  });

  if (!reactionExists) {
    throw new AppError(404, "Reaccion no encontrada");
  }
};

export const buildAlertReactionSummary = async (
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

export const listAlertReactionSummary = async (
  idAlerta: number,
  idUsuario?: number | null
): Promise<AlertReactionSummary[]> => {
  await ensureAlertExists(idAlerta);
  return buildAlertReactionSummary(idAlerta, idUsuario);
};

export const toggleReactionForAlert = async (
  idAlerta: number,
  idUsuario: number,
  idReaccion: number
): Promise<AlertReactionSummary[]> => {
  await Promise.all([ensureAlertExists(idAlerta), ensureReactionExists(idReaccion)]);

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

  return buildAlertReactionSummary(idAlerta, idUsuario);
};

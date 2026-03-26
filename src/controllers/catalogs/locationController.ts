import { Request, Response } from "express";
import Barrio from "../../models/Barrio";
import Comuna from "../../models/Comuna";
import { AppError } from "../../utils/appError";

export const listComunas = async (_req: Request, res: Response) => {
  const comunas = await Comuna.findAll({
    order: [["id_comuna", "ASC"]],
    attributes: ["id_comuna", "nombre"],
  });

  return res.json(comunas);
};

export const listBarriosByComuna = async (req: Request, res: Response) => {
  const idComuna = Number(req.params.idComuna);
  if (!Number.isInteger(idComuna)) {
    throw new AppError(400, "ID de comuna invalido");
  }

  const comuna = await Comuna.findByPk(idComuna);
  if (!comuna) {
    throw new AppError(404, "Comuna no encontrada");
  }

  const barrios = await Barrio.findAll({
    where: { id_comuna: idComuna },
    order: [["nombre", "ASC"]],
    attributes: ["id_barrio", "id_comuna", "nombre"],
  });

  return res.json(barrios);
};

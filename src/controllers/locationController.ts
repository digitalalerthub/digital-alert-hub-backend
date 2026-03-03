import { Request, Response } from "express";
import Barrio from "../models/Barrio";
import Comuna from "../models/Comuna";

export const listComunas = async (_req: Request, res: Response) => {
  try {
    const comunas = await Comuna.findAll({
      order: [["id_comuna", "ASC"]],
      attributes: ["id_comuna", "nombre"],
    });

    return res.json(comunas);
  } catch (error) {
    console.error("Error al obtener comunas:", error);
    return res.status(500).json({ message: "Error al obtener comunas" });
  }
};

export const listBarriosByComuna = async (req: Request, res: Response) => {
  try {
    const idComuna = Number(req.params.idComuna);
    if (!Number.isInteger(idComuna)) {
      return res.status(400).json({ message: "ID de comuna invalido" });
    }

    const comuna = await Comuna.findByPk(idComuna);
    if (!comuna) {
      return res.status(404).json({ message: "Comuna no encontrada" });
    }

    const barrios = await Barrio.findAll({
      where: { id_comuna: idComuna },
      order: [["nombre", "ASC"]],
      attributes: ["id_barrio", "id_comuna", "nombre"],
    });

    return res.json(barrios);
  } catch (error) {
    console.error("Error al obtener barrios:", error);
    return res.status(500).json({ message: "Error al obtener barrios" });
  }
};

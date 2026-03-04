import { Request, Response } from "express";
import Reaction from "../models/Reaction";

export const listReacciones = async (_req: Request, res: Response) => {
  try {
    const reacciones = await Reaction.findAll({
      order: [["id_reaccion", "ASC"]],
      attributes: ["id_reaccion", "tipo", "descrip_tipo_reaccion"],
    });

    return res.json(reacciones);
  } catch (error) {
    console.error("Error al obtener reacciones:", error);
    return res.status(500).json({ message: "Error al obtener reacciones" });
  }
};

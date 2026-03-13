import { Request, Response } from "express";
import Usuario from "../models/User";
import Alerta from "../models/Alert";

export const getStats = async (req: Request, res: Response) => {
  try {

    const ciudadanos = await Usuario.count();
    const alertasTotales = await Alerta.count();
    const alertasResueltas = await Alerta.count({
      where: { id_estado: 3 }
    });
    const alertasPendientes = await Alerta.count({
      where: { id_estado: 1 }
    });

    return res.json({
      ciudadanos,
      alertasTotales,
      alertasAtendidas: alertasResueltas,
      alertasResueltas,
      alertasPendientes
    });
  } catch (error) {
    console.error("❌ Error obteniendo stats:", error);
    return res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
};

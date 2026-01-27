import { Request, Response } from "express";
import Role from "../models/Role";

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id_rol", "nombre_rol"],
    });
    res.json(roles);
  } catch (error) {
    console.error("Error obteniendo roles:", error);
    res.status(500).json({ message: "Error al obtener los roles" });
  }
};

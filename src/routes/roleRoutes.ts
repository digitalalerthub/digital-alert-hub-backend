import { Router } from "express";
import Rol from "../models/Role";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const roles = await Rol.findAll({ order: [["id_rol", "ASC"]] });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

export default router;

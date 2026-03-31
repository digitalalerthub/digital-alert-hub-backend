import { Request, Response } from "express";
import Categoria from "../../models/catalogs/Categoria";
import Estado from "../../models/catalogs/Estado";

export const listEstados = async (_req: Request, res: Response) => {
  const estados = await Estado.findAll({
    attributes: ["id_estado", "nombre_estado"],
    order: [["id_estado", "ASC"]],
    raw: true,
  });

  return res.json(
    estados.map((estado) => ({
      id_estado: Number(estado.id_estado),
      label: estado.nombre_estado?.trim() || `Estado ${estado.id_estado}`,
    }))
  );
};

export const listCategorias = async (_req: Request, res: Response) => {
  const categorias = await Categoria.findAll({
    attributes: ["id_categoria", "nombre_categoria"],
    order: [["id_categoria", "ASC"]],
    raw: true,
  });

  return res.json(
    categorias.map((categoria) => ({
      id_categoria: Number(categoria.id_categoria),
      label:
        categoria.nombre_categoria?.trim() ||
        `Categoria ${Number(categoria.id_categoria)}`,
    }))
  );
};

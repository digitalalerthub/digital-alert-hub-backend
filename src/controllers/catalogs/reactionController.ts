import { Request, Response } from "express";
import { listReactionsCatalog } from "../../services/catalogs/reactionCatalogService";

export const listReacciones = async (_req: Request, res: Response) => {
  const reacciones = await listReactionsCatalog();
  return res.json(reacciones);
};

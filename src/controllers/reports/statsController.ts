import { Request, Response } from "express";
import { getPlatformStats } from "../../services/reports/statsService";

export const getStats = async (_req: Request, res: Response) => {
  const stats = await getPlatformStats();
  return res.json(stats);
};

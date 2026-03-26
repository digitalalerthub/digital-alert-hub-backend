import { Request, Response } from "express";
import {
  createRole,
  deleteRole,
  listRolesWithUsage,
  updateRole,
} from "../../services/users/roleService";

export const getRoles = async (_req: Request, res: Response) => {
  const roles = await listRolesWithUsage();
  return res.json(roles);
};

export const createRoleHandler = async (req: Request, res: Response) => {
  const role = await createRole(req.body?.nombre_rol);
  return res.status(201).json(role);
};

export const updateRoleHandler = async (req: Request, res: Response) => {
  const role = await updateRole(req.params.id, req.body?.nombre_rol);
  return res.json(role);
};

export const deleteRoleHandler = async (req: Request, res: Response) => {
  await deleteRole(req.params.id);
  return res.json({ message: "Rol eliminado" });
};

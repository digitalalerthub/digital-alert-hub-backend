import { Request, Response } from "express";
import {
  changeManagedUserStatus,
  createUserFromAdmin,
  listUsersForAdmin,
  updateUserFromAdmin,
} from "../../services/users/userAdminService";

export const getAllUsers = async (_req: Request, res: Response) => {
  const users = await listUsersForAdmin();
  return res.json(users);
};

export const createUserByAdmin = async (req: Request, res: Response) => {
  const result = await createUserFromAdmin(req.body ?? {});
  return res.status(201).json(result);
};

export const updateUserByAdmin = async (req: Request, res: Response) => {
  const result = await updateUserFromAdmin(req.params.id, req.body ?? {});
  return res.json(result);
};

export const changeUserStatus = async (req: Request, res: Response) => {
  const result = await changeManagedUserStatus(req.params.id, req.body?.estado);
  return res.json(result);
};

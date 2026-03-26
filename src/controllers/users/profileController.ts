import { Request, Response } from "express";
import {
  changeUserPassword,
  deleteOwnAccount,
  getProfileData,
  updateProfileData,
} from "../../services/users/profileService";

export const getProfile = async (req: Request, res: Response) => {
  const user = await getProfileData(req.user);
  return res.json(user);
};

export const updateProfile = async (req: Request, res: Response) => {
  const user = await updateProfileData(req.user, req.body ?? {});
  return res.json(user);
};

export const changePassword = async (req: Request, res: Response) => {
  await changeUserPassword(req.user, req.body ?? {});
  return res.json({ message: "Contrasena actualizada correctamente" });
};

export const deleteAccount = async (req: Request, res: Response) => {
  await deleteOwnAccount(req.user);
  return res.json({
    success: true,
    message: "Cuenta eliminada correctamente",
  });
};

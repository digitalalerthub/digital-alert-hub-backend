import { Request, Response } from "express";
import {
  createCommentForAlert,
  deleteCommentForAlert,
  listCommentsForAlert,
  updateCommentForAlert,
} from "../../services/alerts/alertCommentService";

export const listAlertComments = async (req: Request, res: Response) => {
  const comments = await listCommentsForAlert(req.params.id);
  return res.json(comments);
};

export const createAlertComment = async (req: Request, res: Response) => {
  const comment = await createCommentForAlert(req);
  return res.status(201).json(comment);
};

export const updateAlertComment = async (req: Request, res: Response) => {
  const comment = await updateCommentForAlert(req);
  return res.json(comment);
};

export const deleteAlertComment = async (req: Request, res: Response) => {
  await deleteCommentForAlert(req);
  return res.json({ message: "Comentario eliminado" });
};

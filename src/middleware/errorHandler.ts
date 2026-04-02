import { NextFunction, Request, Response } from "express";
import { isAppError } from "../utils/appError";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (isAppError(error)) {
    return res.status(error.statusCode).json({
      message: error.message,
      ...(error.details ?? {}),
    });
  }

  console.error("Unhandled error:", error);
  return res.status(500).json({ message: "Error interno del servidor" });
};

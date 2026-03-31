import { Request, Response } from "express";
import {
  loginUser,
  registerUser,
  resendUserVerificationEmail,
  resetUserPassword,
  sendPasswordReset,
  verifyUserAccount,
} from "../../services/auth/authService";

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await registerUser(req, req.body ?? {});
  res.status(result.statusCode).json(result.body);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = await loginUser(req, req.body ?? {});
  res.json(result);
};

export const verifyAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await verifyUserAccount(req, req.params.token);

  if (result.redirectUrl) {
    res.redirect(result.redirectUrl);
    return;
  }

  res.json({ message: result.message });
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await sendPasswordReset(req, req.body?.email, req.body?.captchaToken);
  res.json(result);
};

export const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await resendUserVerificationEmail(req, req.body?.email);
  res.json(result);
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await resetUserPassword(req, req.params.token, {
    nuevaContrasena: req.body?.nuevaContrasena,
    captchaToken: req.body?.captchaToken,
  });
  res.json(result);
};

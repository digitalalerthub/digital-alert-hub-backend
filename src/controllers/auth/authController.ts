import { Request, Response } from "express";
import {
  exchangeGoogleCallbackCode,
  loginUser,
  registerUser,
  resendUserVerificationEmail,
  resetUserPassword,
  sendPasswordReset,
  validateResetPasswordToken,
  verifyUserAccount,
} from "../../services/auth/authService";
import {
  getAuthCookieName,
  requireRequestUser,
  revokeRequestSession,
} from "../../services/auth/authSessionService";
import { resolveAuthCookieOptions } from "../../config/securityConfig";

const setSessionCookie = (req: Request, res: Response, token: string) => {
  res.cookie(getAuthCookieName(), token, resolveAuthCookieOptions(req));
};

const clearSessionCookie = (req: Request, res: Response) => {
  const cookieOptions = resolveAuthCookieOptions(req);
  res.clearCookie(getAuthCookieName(), {
    ...cookieOptions,
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await registerUser(req, req.body ?? {});
  res.status(result.statusCode).json(result.body);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = await loginUser(req, req.body ?? {});
  setSessionCookie(req, res, result.token);
  res.json({
    message: result.message,
    token: result.token,
    user: result.user,
  });
};

export const exchangeGoogleCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await exchangeGoogleCallbackCode(req.body ?? {});
  setSessionCookie(req, res, result.token);
  res.json({
    message: "Sesion iniciada correctamente",
    token: result.token,
  });
};

export const getSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = requireRequestUser(req);
  res.json({ user });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await revokeRequestSession(req);
  clearSessionCookie(req, res);
  res.json({ message: "Sesion cerrada correctamente" });
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

export const validateResetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await validateResetPasswordToken(req.params.token);
  res.json(result);
};

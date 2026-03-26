import { Request } from "express";
import jwt from "jsonwebtoken";
import Usuario from "../../models/User";
import { normalizeBaseUrl } from "../../utils/url";

export type PasswordActionType = "password_reset" | "set_password";

type EmailVerificationPayload = {
  id: number;
  email: string;
  type: "email_verification";
};

type PasswordActionPayload = {
  id: number;
  email: string;
  type: PasswordActionType;
};

const signToken = (
  payload: EmailVerificationPayload | PasswordActionPayload,
  expiresIn: jwt.SignOptions["expiresIn"]
): string => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
};

export const resolveFrontendBaseUrl = (): string | null => {
  return normalizeBaseUrl(process.env.FRONTEND_URL);
};

export const resolveBackendBaseUrl = (req?: Request): string | null => {
  return normalizeBaseUrl(process.env.BACKEND_URL) || (req ? `${req.protocol}://${req.get("host")}` : null);
};

export const buildVerificationLink = (
  req: Request,
  user: Pick<Usuario, "id_usuario" | "email">
): string => {
  const backendBaseUrl = resolveBackendBaseUrl(req);
  if (!backendBaseUrl) {
    throw new Error("No se pudo determinar BACKEND_URL para construir el enlace");
  }

  const verificationToken = signToken(
    { id: user.id_usuario, email: user.email, type: "email_verification" },
    "24h"
  );

  return `${backendBaseUrl}/api/auth/verify-account/${verificationToken}`;
};

export const buildPasswordActionLink = (
  user: Pick<Usuario, "id_usuario" | "email">,
  type: PasswordActionType
): string => {
  const frontendUrl = resolveFrontendBaseUrl();
  if (!frontendUrl) {
    throw new Error("Falta FRONTEND_URL para construir el enlace de acceso");
  }

  const actionToken = signToken(
    { id: user.id_usuario, email: user.email, type },
    type === "set_password" ? "24h" : "15m"
  );

  const modeQuery = type === "set_password" ? "?mode=activation" : "";
  return `${frontendUrl}/reset-password/${actionToken}${modeQuery}`;
};

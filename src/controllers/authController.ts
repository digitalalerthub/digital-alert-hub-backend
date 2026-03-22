import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Usuario from "../models/User";
import {
  getRecaptchaMinScore,
  isRecaptchaConfigured,
  verifyRecaptchaToken,
} from "../services/recaptchaService";

interface JWTPayload {
  id: number;
  email: string;
  rol: number;
}

interface EmailVerificationPayload {
  id: number;
  email: string;
  type: "email_verification";
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GmailSendResponse {
  id?: string;
  [key: string]: unknown;
}

interface EmailSendResult {
  id?: string;
  provider: "gmail_api" | "smtp";
}

const googleTokenUrl = "https://oauth2.googleapis.com/token";
const gmailSendUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const toBase64Url = (value: string): string => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]{2,100}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{7,15}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 10;

const normalizeBaseUrl = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }

  return `https://${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

const normalizeEmail = (value: unknown): string => {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
};

const normalizePhone = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const buildLockedLoginMessage = (lockedUntil: Date): string => {
  const formattedTime = lockedUntil.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Cuenta bloqueada temporalmente por multiples intentos fallidos. Intenta de nuevo despues de las ${formattedTime}.`;
};

const validateRegistrationPayload = (payload: {
  nombre: unknown;
  apellido: unknown;
  email: unknown;
  contrasena: unknown;
  telefono: unknown;
}): string | null => {
  const nombre = typeof payload.nombre === "string" ? payload.nombre.trim() : "";
  const apellido = typeof payload.apellido === "string" ? payload.apellido.trim() : "";
  const email = normalizeEmail(payload.email);
  const contrasena =
    typeof payload.contrasena === "string" ? payload.contrasena.trim() : "";
  const telefono = normalizePhone(payload.telefono);

  if (!NAME_REGEX.test(nombre)) {
    return "El nombre solo puede contener letras, espacios, apostrofes o guiones, y debe tener al menos 2 caracteres";
  }

  if (!NAME_REGEX.test(apellido)) {
    return "El apellido solo puede contener letras, espacios, apostrofes o guiones, y debe tener al menos 2 caracteres";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Debes ingresar un correo electronico con formato valido";
  }

  if (!PHONE_REGEX.test(telefono)) {
    return "El telefono debe contener solo numeros y tener entre 7 y 15 digitos";
  }

  if (!PASSWORD_REGEX.test(contrasena)) {
    return "La contrasena debe tener minimo 8 caracteres e incluir letras y numeros";
  }

  return null;
};

const canUseGmailApi = (): boolean => {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;
  const sender = process.env.GOOGLE_GMAIL_SENDER || process.env.EMAIL_USER;

  return Boolean(clientId && clientSecret && refreshToken && sender);
};

const canUseSmtp = (): boolean => {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_PORT &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
  );
};

const getGmailAccessToken = async (): Promise<string> => {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan variables para Gmail API: GOOGLE_GMAIL_CLIENT_ID/GOOGLE_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET/GOOGLE_CLIENT_SECRET y GOOGLE_GMAIL_REFRESH_TOKEN"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      `No se pudo obtener access token de Google: ${JSON.stringify(data)}`
    );
  }

  return data.access_token;
};

const buildMailRaw = (to: string, from: string, subject: string, html: string): string => {
  const rawMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  return toBase64Url(rawMessage);
};

const sendGmailEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<GmailSendResponse> => {
  const from = process.env.GOOGLE_GMAIL_SENDER || process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Falta GOOGLE_GMAIL_SENDER o EMAIL_USER para el remitente");
  }

  const accessToken = await getGmailAccessToken();
  const raw = buildMailRaw(to, from, subject, html);

  const response = await fetch(gmailSendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  const data = (await response.json()) as GmailSendResponse;

  if (!response.ok) {
    throw new Error(`Gmail API respondio ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
};

const sendSmtpEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<EmailSendResult> => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure =
    process.env.EMAIL_SECURE === "true" || (!process.env.EMAIL_SECURE && port === 465);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Faltan variables SMTP: EMAIL_HOST, EMAIL_PORT, EMAIL_USER y EMAIL_PASS"
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.GOOGLE_GMAIL_SENDER || user,
    to,
    subject,
    html,
  });

  return {
    id: info.messageId,
    provider: "smtp",
  };
};

const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<EmailSendResult> => {
  if (canUseGmailApi()) {
    try {
      const info = await sendGmailEmail(to, subject, html);
      return {
        id: info.id,
        provider: "gmail_api",
      };
    } catch (gmailError) {
      console.error("Fallo envio con Gmail API:", gmailError);

      if (!canUseSmtp()) {
        throw new Error(
          `No se pudo enviar el correo con Gmail API: ${getErrorMessage(gmailError)}`
        );
      }
    }
  }

  if (canUseSmtp()) {
    try {
      return await sendSmtpEmail(to, subject, html);
    } catch (smtpError) {
      throw new Error(
        `No se pudo enviar el correo con SMTP: ${getErrorMessage(smtpError)}`
      );
    }
  }

  throw new Error(
    "No hay un metodo de envio configurado. Configura Gmail API o SMTP en las variables de entorno."
  );
};

const sendPasswordResetEmail = async (
  to: string,
  resetLink: string
): Promise<EmailSendResult> => {
  const subject = "Recuperacion de contrasena";
  const html = `
    <h2>Recuperacion de contrasena</h2>
    <p>Haz clic en el siguiente enlace para restablecer tu contrasena:</p>
    <a href="${resetLink}" target="_blank">${resetLink}</a>
    <p>Este enlace expirara en 15 minutos.</p>
  `.trim();

  return sendEmail(to, subject, html);
};

const sendAccountCreatedEmail = async (
  to: string,
  nombre: string,
  verificationLink: string
): Promise<EmailSendResult> => {
  const subject = "Confirma tu cuenta";
  const html = `
    <h2>Bienvenido a Digital Alert Hub</h2>
    <p>Hola ${nombre}, tu cuenta fue creada correctamente.</p>
    <p>Para activarla, confirma tu correo en el siguiente enlace:</p>
    <a href="${verificationLink}" target="_blank">${verificationLink}</a>
    <p>Este enlace expira en 24 horas.</p>
  `.trim();

  return sendEmail(to, subject, html);
};

const buildVerificationLink = (
  req: Request,
  user: Pick<Usuario, "id_usuario" | "email">
): string => {
  const verificationToken = jwt.sign(
    { id: user.id_usuario, email: user.email, type: "email_verification" },
    process.env.JWT_SECRET as string,
    { expiresIn: "24h" }
  );

  const backendBaseUrl =
    normalizeBaseUrl(process.env.BACKEND_URL) ||
    `${req.protocol}://${req.get("host")}`;

  return `${backendBaseUrl}/api/auth/verify-account/${verificationToken}`;
};

const validateRecaptcha = async (
  req: Request,
  res: Response,
  captchaToken: unknown,
  expectedAction: "login" | "register"
): Promise<boolean> => {
  if (!isRecaptchaConfigured()) {
    return true;
  }

  if (typeof captchaToken !== "string" || !captchaToken.trim()) {
    res.status(400).json({ message: "Debes completar el reCAPTCHA." });
    return false;
  }

  try {
    const recaptchaResult = await verifyRecaptchaToken(captchaToken, req.ip);
    const minScore = getRecaptchaMinScore();

    if (!recaptchaResult.success) {
      console.warn("reCAPTCHA invalido:", recaptchaResult.errorCodes);
      res.status(400).json({
        message: "La validacion reCAPTCHA fallo. Intentalo otra vez.",
      });
      return false;
    }

    if (recaptchaResult.action && recaptchaResult.action !== expectedAction) {
      console.warn("reCAPTCHA action invalida:", {
        expectedAction,
        action: recaptchaResult.action,
      });
      res.status(400).json({
        message: "La validacion reCAPTCHA no coincide con la accion esperada.",
      });
      return false;
    }

    if (
      recaptchaResult.score !== null &&
      recaptchaResult.score < minScore
    ) {
      console.warn("reCAPTCHA score bajo:", {
        expectedAction,
        score: recaptchaResult.score,
        minScore,
      });
      res.status(400).json({
        message: "La validacion reCAPTCHA fue considerada riesgosa. Intentalo otra vez.",
      });
      return false;
    }

    return true;
  } catch (recaptchaError) {
    console.error("Error verificando reCAPTCHA:", recaptchaError);
    res.status(502).json({
      message:
        "No se pudo validar reCAPTCHA en este momento. Intentalo de nuevo.",
    });
    return false;
  }
};

// Registro
export const register = async (req: Request, res: Response): Promise<void> => {
  const { nombre, apellido, email, contrasena, telefono, id_rol, captchaToken } =
    req.body;

  try {
    const normalizedNombre = typeof nombre === "string" ? nombre.trim() : "";
    const normalizedApellido = typeof apellido === "string" ? apellido.trim() : "";
    const normalizedEmail = normalizeEmail(email);
    const normalizedTelefono = normalizePhone(telefono);
    const normalizedPassword =
      typeof contrasena === "string" ? contrasena.trim() : "";

    const validationError = validateRegistrationPayload({
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      email: normalizedEmail,
      contrasena: normalizedPassword,
      telefono: normalizedTelefono,
    });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const existe = await Usuario.findOne({ where: { email: normalizedEmail } });
    if (existe) {
      res.status(409).json({ message: "El correo ya esta registrado" });
      return;
    }

    const recaptchaOk = await validateRecaptcha(req, res, captchaToken, "register");
    if (!recaptchaOk) {
      return;
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    const user = await Usuario.create({
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      email: normalizedEmail,
      contrasena: hashedPassword,
      telefono: normalizedTelefono,
      id_rol: id_rol || 2,
      estado: true,
      email_verificado: false,
    });

    const verificationLink = buildVerificationLink(req, user);

    let emailSent = false;
    let emailProvider: EmailSendResult["provider"] | null = null;

    try {
      const info = await sendAccountCreatedEmail(
        user.email,
        user.nombre,
        verificationLink
      );
      console.log("Correo de confirmacion enviado:", info.provider, info.id);
      emailSent = true;
      emailProvider = info.provider;
    } catch (mailError) {
      console.error("No se pudo enviar correo de confirmacion:", mailError);
    }

    res.status(201).json({
      message: emailSent
        ? "Usuario registrado. Revisa tu correo para activar la cuenta."
        : "Usuario registrado, pero no se pudo enviar el correo de activacion.",
      email_sent: emailSent,
      email_provider: emailProvider,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, contrasena, captchaToken } = req.body;

  try {
    const recaptchaOk = await validateRecaptcha(req, res, captchaToken, "login");
    if (!recaptchaOk) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword =
      typeof contrasena === "string" ? contrasena.trim() : "";

    const user = await Usuario.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const now = new Date();
    if (user.bloqueo_hasta && user.bloqueo_hasta > now) {
      res.status(423).json({ message: buildLockedLoginMessage(user.bloqueo_hasta) });
      return;
    }

    if (user.bloqueo_hasta && user.bloqueo_hasta <= now) {
      await user.update({
        intentos_fallidos: 0,
        bloqueo_hasta: null,
      });
    }

    const valido = await bcrypt.compare(normalizedPassword, user.contrasena);
    if (!valido) {
      const nextFailedAttempts = (user.intentos_fallidos || 0) + 1;

      if (nextFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
        await user.update({
          intentos_fallidos: 0,
          bloqueo_hasta: lockedUntil,
        });
        res.status(423).json({ message: buildLockedLoginMessage(lockedUntil) });
        return;
      }

      await user.update({
        intentos_fallidos: nextFailedAttempts,
        bloqueo_hasta: null,
      });

      const remainingAttempts = MAX_LOGIN_ATTEMPTS - nextFailedAttempts;
      res.status(401).json({
        message: `Contrasena incorrecta. Te quedan ${remainingAttempts} intentos antes del bloqueo temporal.`,
      });
      return;
    }

    if (user.intentos_fallidos !== 0 || user.bloqueo_hasta) {
      await user.update({
        intentos_fallidos: 0,
        bloqueo_hasta: null,
      });
    }

    if (!user.estado) {
      res.status(403).json({
        message:
          "Tu cuenta esta inactiva. Contacta al administrador para reactivarla.",
      });
      return;
    }

    if (!user.email_verificado) {
      res.status(403).json({
        message:
          "Debes confirmar tu correo para activar la cuenta antes de iniciar sesion.",
      });
      return;
    }

    const payload: JWTPayload = {
      id: user.id_usuario,
      email: user.email,
      rol: user.id_rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "8h",
    });

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const verifyAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as EmailVerificationPayload;

    if (decoded.type !== "email_verification") {
      res.status(400).json({ message: "Token de verificacion invalido" });
      return;
    }

    const user = await Usuario.findByPk(decoded.id);
    if (!user || user.email !== decoded.email) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    if (!user.email_verificado) {
      await user.update({ email_verificado: true, estado: true });
    }

    const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
    if (frontendUrl) {
      res.redirect(`${frontendUrl}/login?verified=1`);
      return;
    }

    res.json({ message: "Cuenta verificada correctamente" });
  } catch (error) {
    console.error("Error en verifyAccount:", error);
    res.status(400).json({ message: "Token invalido o expirado" });
  }
};

// Recuperar contrasena (envia correo)
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  try {
    console.log("Iniciando recuperacion de contrasena para:", email);

    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      console.log("Usuario no encontrado:", email);
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    console.log("Usuario encontrado:", user.email);

    const resetToken = jwt.sign(
      { id: user.id_usuario, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
    if (!frontendUrl) {
      res.status(500).json({
        message: "Falta FRONTEND_URL para construir el enlace de recuperacion",
      });
      return;
    }

    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
    console.log("Link de recuperacion:", resetLink);

    console.log(
      "Enviando correo de recuperacion desde:",
      process.env.GOOGLE_GMAIL_SENDER || process.env.EMAIL_USER
    );
    const info = await sendPasswordResetEmail(email, resetLink);

    console.log("Correo de recuperacion enviado:", info.provider, info.id);
    res.json({
      message: "Correo de recuperacion enviado correctamente",
      email_provider: info.provider,
    });
  } catch (error: any) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({
      message: "Error al enviar el correo",
      error: error.message || error,
    });
  }
};

export const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  try {
    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    if (user.email_verificado) {
      res.status(400).json({ message: "La cuenta ya esta verificada" });
      return;
    }

    const verificationLink = buildVerificationLink(req, user);
    const info = await sendAccountCreatedEmail(
      user.email,
      user.nombre,
      verificationLink
    );

    console.log("Correo de verificacion reenviado:", info.provider, info.id);
    res.json({
      message: "Correo de verificacion reenviado correctamente",
      email_provider: info.provider,
    });
  } catch (error: any) {
    console.error("Error en resendVerificationEmail:", error);
    res.status(500).json({
      message: "Error al reenviar el correo de verificacion",
      error: error.message || error,
    });
  }
};

// Resetear contrasena
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.params;
  const { nuevaContrasena } = req.body;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JWTPayload;
    const user = await Usuario.findByPk(decoded.id);

    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    await user.update({ contrasena: hashedPassword });

    res.json({ message: "Contrasena actualizada correctamente" });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    res.status(500).json({ message: "Token invalido o expirado" });
  }
};

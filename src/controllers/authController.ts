import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Usuario from "../models/User";

interface JWTPayload {
  id: number;
  email: string;
  rol: number;
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

const googleTokenUrl = "https://oauth2.googleapis.com/token";
const gmailSendUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const toBase64Url = (value: string): string => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

const buildResetMailRaw = (to: string, from: string, resetLink: string): string => {
  const subject = "Recuperacion de contrasena";
  const html = `
    <h2>Recuperacion de contrasena</h2>
    <p>Haz clic en el siguiente enlace para restablecer tu contrasena:</p>
    <a href="${resetLink}" target="_blank">${resetLink}</a>
    <p>Este enlace expirara en 15 minutos.</p>
  `.trim();

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

const sendPasswordResetEmail = async (
  to: string,
  resetLink: string
): Promise<GmailSendResponse> => {
  const from = process.env.GOOGLE_GMAIL_SENDER || process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Falta GOOGLE_GMAIL_SENDER o EMAIL_USER para el remitente");
  }

  const accessToken = await getGmailAccessToken();
  const raw = buildResetMailRaw(to, from, resetLink);

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

// Registro
export const register = async (req: Request, res: Response): Promise<void> => {
  const { nombre, apellido, email, contrasena, telefono, id_rol } = req.body;

  try {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      res.status(409).json({ message: "El correo ya esta registrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const user = await Usuario.create({
      nombre,
      apellido,
      email,
      contrasena: hashedPassword,
      telefono,
      id_rol: id_rol || 1,
      estado: true,
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente",
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
  const { email, contrasena } = req.body;

  try {
    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const valido = await bcrypt.compare(contrasena, user.contrasena);
    if (!valido) {
      res.status(401).json({ message: "Contrasena incorrecta" });
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

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log("Link de recuperacion:", resetLink);

    console.log("Enviando correo con Gmail API desde:", process.env.GOOGLE_GMAIL_SENDER || process.env.EMAIL_USER);
    const info = await sendPasswordResetEmail(email, resetLink);

    console.log("Correo enviado con Gmail API:", info.id);
    res.json({ message: "Correo de recuperacion enviado correctamente" });
  } catch (error: any) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({
      message: "Error al enviar el correo",
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

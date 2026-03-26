import nodemailer from "nodemailer";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GmailSendResponse {
  id?: string;
  [key: string]: unknown;
}

export interface EmailSendResult {
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

export const sendEmail = async (
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

export const sendPasswordResetEmail = async (
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

export const sendAccountCreatedEmail = async (
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

export const sendAccountSetupEmail = async (
  to: string,
  nombre: string,
  setupLink: string
): Promise<EmailSendResult> => {
  const subject = "Activa tu cuenta y define tu contrasena";
  const html = `
    <h2>Bienvenido a Digital Alert Hub</h2>
    <p>Hola ${nombre}, un administrador creo tu cuenta.</p>
    <p>Usa este enlace para activar la cuenta y establecer tu contrasena:</p>
    <a href="${setupLink}" target="_blank">${setupLink}</a>
    <p>Este enlace expira en 24 horas.</p>
  `.trim();

  return sendEmail(to, subject, html);
};

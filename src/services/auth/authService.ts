import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request } from "express";
import User from "../../models/User";
import { AppError } from "../../utils/appError";
import { parsePositiveInt } from "../../utils/number";
import { getRoleNameForToken, resolveRoleIdByCanonicalName } from "../../utils/roleUtils";
import {
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "../../utils/userValidation";
import {
  getRecaptchaMinScore,
  isRecaptchaConfigured,
  verifyRecaptchaToken,
} from "./recaptchaService";
import {
  buildPasswordActionLink,
  buildVerificationLink,
  resolveFrontendBaseUrl,
} from "./authLinkService";
import {
  EmailSendResult,
  sendAccountCreatedEmail,
  sendPasswordResetEmail,
} from "./authMailService";

interface JWTPayload {
  id: number;
  email: string;
  rol: number;
  role_name?: string | null;
}

interface EmailVerificationPayload {
  id: number;
  email: string;
  type: "email_verification";
}

interface PasswordActionPayload {
  id: number;
  email: string;
  type?: "password_reset" | "set_password";
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 10;

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

  const nombreError = validateName(nombre, "nombre");
  if (nombreError) return nombreError;

  const apellidoError = validateName(apellido, "apellido");
  if (apellidoError) return apellidoError;

  const emailError = validateEmail(email);
  if (emailError) return emailError;

  const telefonoError = validatePhone(telefono, { required: true });
  if (telefonoError) return telefonoError;

  const passwordError = validatePassword(contrasena);
  if (passwordError) return passwordError;

  return null;
};

const validateRecaptchaOrThrow = async (
  req: Request,
  captchaToken: unknown,
  expectedAction: "login" | "register"
) => {
  if (!isRecaptchaConfigured()) {
    return;
  }

  if (typeof captchaToken !== "string" || !captchaToken.trim()) {
    throw new AppError(400, "Debes completar el reCAPTCHA.");
  }

  try {
    const recaptchaResult = await verifyRecaptchaToken(captchaToken, req.ip);
    const minScore = getRecaptchaMinScore();

    if (!recaptchaResult.success) {
      console.warn("reCAPTCHA invalido:", recaptchaResult.errorCodes);
      throw new AppError(400, "La validacion reCAPTCHA fallo. Intentalo otra vez.");
    }

    if (recaptchaResult.action && recaptchaResult.action !== expectedAction) {
      console.warn("reCAPTCHA action invalida:", {
        expectedAction,
        action: recaptchaResult.action,
      });
      throw new AppError(
        400,
        "La validacion reCAPTCHA no coincide con la accion esperada."
      );
    }

    if (recaptchaResult.score !== null && recaptchaResult.score < minScore) {
      console.warn("reCAPTCHA score bajo:", {
        expectedAction,
        score: recaptchaResult.score,
        minScore,
      });
      throw new AppError(
        400,
        "La validacion reCAPTCHA fue considerada riesgosa. Intentalo otra vez."
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error("Error verificando reCAPTCHA:", error);
    throw new AppError(
      502,
      "No se pudo validar reCAPTCHA en este momento. Intentalo de nuevo."
    );
  }
};

export const registerUser = async (
  req: Request,
  payload: Record<string, unknown>
) => {
  const { nombre, apellido, email, contrasena, telefono, id_rol, captchaToken } =
    payload;

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
    throw new AppError(400, validationError);
  }

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError(409, "El correo ya esta registrado");
  }

  await validateRecaptchaOrThrow(req, captchaToken, "register");

  const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
  const requestedRoleId = parsePositiveInt(id_rol);
  const defaultCitizenRoleId = await resolveRoleIdByCanonicalName("ciudadano");

  if (!defaultCitizenRoleId) {
    throw new AppError(
      500,
      "El rol Ciudadano no esta configurado en la base de datos"
    );
  }

  const user = await User.create({
    nombre: normalizedNombre,
    apellido: normalizedApellido,
    email: normalizedEmail,
    contrasena: hashedPassword,
    telefono: normalizedTelefono,
    id_rol: requestedRoleId ?? defaultCitizenRoleId,
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

  const roleName = await getRoleNameForToken(user.id_rol);

  return {
    statusCode: 201,
    body: {
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
        id_rol: user.id_rol,
        role_name: roleName,
      },
    },
  };
};

export const loginUser = async (
  req: Request,
  payload: Record<string, unknown>
) => {
  const { email, contrasena, captchaToken } = payload;

  await validateRecaptchaOrThrow(req, captchaToken, "login");

  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword =
    typeof contrasena === "string" ? contrasena.trim() : "";

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError(404, "Usuario no encontrado");
  }

  const now = new Date();
  if (user.bloqueo_hasta && user.bloqueo_hasta > now) {
    throw new AppError(423, buildLockedLoginMessage(user.bloqueo_hasta));
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
      throw new AppError(423, buildLockedLoginMessage(lockedUntil));
    }

    await user.update({
      intentos_fallidos: nextFailedAttempts,
      bloqueo_hasta: null,
    });

    const remainingAttempts = MAX_LOGIN_ATTEMPTS - nextFailedAttempts;
    throw new AppError(
      401,
      `Contrasena incorrecta. Te quedan ${remainingAttempts} intentos antes del bloqueo temporal.`
    );
  }

  if (user.intentos_fallidos !== 0 || user.bloqueo_hasta) {
    await user.update({
      intentos_fallidos: 0,
      bloqueo_hasta: null,
    });
  }

  if (!user.estado) {
    throw new AppError(
      403,
      "Tu cuenta esta inactiva. Contacta al administrador para reactivarla."
    );
  }

  if (!user.email_verificado) {
    throw new AppError(
      403,
      "Debes confirmar tu correo para activar la cuenta antes de iniciar sesion."
    );
  }

  const roleName = await getRoleNameForToken(user.id_rol);
  if (!roleName) {
    throw new AppError(
      500,
      "El rol del usuario no esta configurado en la base de datos"
    );
  }

  const tokenPayload: JWTPayload = {
    id: user.id_usuario,
    email: user.email,
    rol: user.id_rol,
    role_name: roleName,
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET as string, {
    expiresIn: "8h",
  });

  return {
    message: "Login exitoso",
    token,
    user: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      id_rol: user.id_rol,
      role_name: roleName,
    },
  };
};

export const verifyUserAccount = async (_req: Request, token: string) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as EmailVerificationPayload;

    if (decoded.type !== "email_verification") {
      throw new AppError(400, "Token de verificacion invalido");
    }

    const user = await User.findByPk(decoded.id);
    if (!user || user.email !== decoded.email) {
      throw new AppError(404, "Usuario no encontrado");
    }

    if (!user.email_verificado) {
      await user.update({ email_verificado: true, estado: true });
    }

    const frontendUrl = resolveFrontendBaseUrl();
    if (frontendUrl) {
      return {
        redirectUrl: `${frontendUrl}/login?verified=1`,
      };
    }

    return {
      message: "Cuenta verificada correctamente",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error("Error en verifyAccount:", error);
    throw new AppError(400, "Token invalido o expirado");
  }
};

export const sendPasswordReset = async (emailValue: unknown) => {
  const normalizedEmail = normalizeEmail(emailValue);
  const emailError = validateEmail(normalizedEmail);
  if (emailError) {
    throw new AppError(400, emailError);
  }

  console.log("Iniciando recuperacion de contrasena para:", normalizedEmail);

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    console.log("Usuario no encontrado:", normalizedEmail);
    throw new AppError(404, "Usuario no encontrado");
  }

  console.log("Usuario encontrado:", user.email);

  const resetLink = buildPasswordActionLink(user, "password_reset");
  console.log("Link de recuperacion:", resetLink);

  console.log(
    "Enviando correo de recuperacion desde:",
    process.env.GOOGLE_GMAIL_SENDER || process.env.EMAIL_USER
  );
  const info = await sendPasswordResetEmail(normalizedEmail, resetLink);

  console.log("Correo de recuperacion enviado:", info.provider, info.id);
  return {
    message: "Correo de recuperacion enviado correctamente",
    email_provider: info.provider,
  };
};

export const resendUserVerificationEmail = async (
  req: Request,
  emailValue: unknown
) => {
  const normalizedEmail = normalizeEmail(emailValue);
  const emailError = validateEmail(normalizedEmail);
  if (emailError) {
    throw new AppError(400, emailError);
  }

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError(404, "Usuario no encontrado");
  }

  if (user.email_verificado) {
    throw new AppError(400, "La cuenta ya esta verificada");
  }

  const verificationLink = buildVerificationLink(req, user);
  const info = await sendAccountCreatedEmail(
    user.email,
    user.nombre,
    verificationLink
  );

  console.log("Correo de verificacion reenviado:", info.provider, info.id);
  return {
    message: "Correo de verificacion reenviado correctamente",
    email_provider: info.provider,
  };
};

export const resetUserPassword = async (
  token: string,
  newPasswordValue: unknown
) => {
  const nuevaContrasena =
    typeof newPasswordValue === "string" ? newPasswordValue.trim() : "";

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as PasswordActionPayload;
    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    const passwordError = validatePassword(nuevaContrasena);
    if (passwordError) {
      throw new AppError(400, passwordError);
    }

    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    const isAccountSetup = decoded.type === "set_password";

    await user.update({
      contrasena: hashedPassword,
      ...(isAccountSetup ? { email_verificado: true, estado: true } : {}),
    });

    return {
      message: isAccountSetup
        ? "Cuenta activada y contrasena configurada correctamente"
        : "Contrasena actualizada correctamente",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error("Error en resetPassword:", error);
    throw new AppError(500, "Token invalido o expirado");
  }
};

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Usuario from "../models/User";

interface JWTPayload {
  id: number;
  email: string;
  rol: number;
}

// Transportador de correo (Nodemailer)
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: process.env.EMAIL_HOST, // ejemplo: smtp.gmail.com, smtp.office365.com, mail.tudominio.com
  port: Number(process.env.EMAIL_PORT) || 587, // usa 465 si quieres SSL
  secure: process.env.EMAIL_SECURE === "true", // true para SSL (puerto 465), false para STARTTLS (587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar conexión de transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error en configuración de Nodemailer:", error);
  } else {
    console.log("✅ Nodemailer configurado correctamente");
  }
});

// Registro
export const register = async (req: Request, res: Response): Promise<void> => {
  const { nombre, apellido, email, contrasena, telefono, id_rol } = req.body;

  try {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      res.status(409).json({ message: "El correo ya está registrado" });
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
      res.status(401).json({ message: "Contraseña incorrecta" });
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

// Recuperar contraseña (envía correo)
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  try {
    console.log("📧 Iniciando recuperación de contraseña para:", email);
    
    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      console.log("❌ Usuario no encontrado:", email);
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    console.log("✅ Usuario encontrado:", user.email);

    // Generar token temporal de 15 minutos
    const resetToken = jwt.sign(
      { id: user.id_usuario, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log("🔗 Link de recuperación:", resetLink);

    // Enviar correo
    console.log("📤 Intentando enviar correo desde:", process.env.EMAIL_USER);
    
    const info = await transporter.sendMail({
      from: `"Digital Alert Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Recuperación de contraseña",
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>Este enlace expirará en 15 minutos.</p>
      `,
    });

    console.log("✅ Correo enviado:", info.messageId);
    res.json({ message: "Correo de recuperación enviado correctamente" });
  } catch (error: any) {
    console.error("❌ Error en forgotPassword:", error);
    console.error("Error code:", error.code);
    console.error("Error response:", error.response);
    res.status(500).json({
      message: "Error al enviar el correo",
      error: error.message || error,
    });
  }
};

// Resetear contraseña
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.params; // el token viene en la URL (cambio)
  const { nuevaContrasena } = req.body; // viene del body (cambio)

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

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    res.status(500).json({ message: "Token inválido o expirado" });
  }
};

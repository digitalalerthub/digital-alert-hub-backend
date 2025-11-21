import { Request, Response } from "express"; // Importamos los tipos de Express para manejar peticiones y respuestas tipadas

// Importamos librerías para seguridad y autenticación
import bcrypt from "bcrypt"; // Para encriptar contraseñas
import jwt from "jsonwebtoken"; // Para generar y verificar tokens JWT
import nodemailer from "nodemailer"; // Para enviar correos electrónicos
import Usuario from "../models/User"; // Modelo Sequelize que representa la tabla de usuarios

interface JWTPayload {
  //  Interfaz para definir qué datos incluirá el JWT (token)
  id: number;
  email: string;
  rol: number;
}

const transporter = nodemailer.createTransport({
  //   Configuración del transportador de correos (Nodemailer)
  service: "gmail", // Servicio de correo (puede ser otro)
  host: process.env.EMAIL_HOST, // Servidor SMTP (depende del proveedor)
  port: Number(process.env.EMAIL_PORT) || 587, // Puerto (587 = TLS, 465 = SSL)
  secure: process.env.EMAIL_SECURE === "false", // false → STARTTLS, true → SSL
  auth: {
    user: process.env.EMAIL_USER, // Correo remitente
    pass: process.env.EMAIL_PASS, // Contraseña o app password del remitente
  },
});

export const register = async (req: Request, res: Response): Promise<void> => {
  //  REGISTRO DE USUARIO
  const { nombre, apellido, email, contrasena, telefono, id_rol } = req.body;

  try {
    const existe = await Usuario.findOne({ where: { email } }); // Verifica si el correo ya está registrado
    if (existe) {
      res.status(409).json({ message: "El correo ya está registrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10); // Encripta la contraseña antes de guardarla

    const user = await Usuario.create({
      // Crea un nuevo usuario en la base de datos
      nombre,
      apellido,
      email,
      contrasena: hashedPassword, // Se guarda encriptada
      telefono,
      id_rol: id_rol || 2, // Si no se envía, por defecto el rol es 2 (usuario común)
      estado: true, // Usuario activo al crearse
    });

    res.status(201).json({
      // Respuesta exitosa con los datos básicos del usuario (sin mostrar la contraseña)
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

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, contrasena } = req.body;

  try {
    const user = await Usuario.findOne({ where: { email } }); // Verifica si el usuario existe por su email
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const valido = await bcrypt.compare(contrasena, user.contrasena); // Compara la contraseña ingresada con la encriptada en la base de datos
    if (!valido) {
      res.status(401).json({ message: "Contraseña incorrecta" });
      return;
    }

    const payload: JWTPayload = {
      // Crea el payload del JWT (datos que irán dentro del token)
      id: user.id_usuario,
      email: user.email,
      rol: user.id_rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      // Genera el token con una duración de 8 horas
      expiresIn: "8h",
    });

    res.json({
      // Responde con el token y la información del usuario
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

//  RECUPERAR CONTRASEÑA → Envía un enlace al correo del usuario
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  try {
    const user = await Usuario.findOne({ where: { email } }); // Busca si el correo existe
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    const resetToken = jwt.sign(
      // Genera un token temporal que expira en 15 minutos
      { id: user.id_usuario, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`; // Crea un enlace de recuperación con el token incluido

    await transporter.sendMail({
      // Envía el correo con el enlace al usuario
      from: `"Digital Alert Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Recuperación de contraseña",
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>⚠️ Este enlace expirará en 15 minutos.</p>
      `,
    });

    res.json({ message: "Correo de recuperación enviado correctamente" }); // Confirmación
  } catch (error: any) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({
      message: "Error al enviar el correo",
      error: error.message || error,
    });
  }
};

//   RESETEAR CONTRASEÑA → Cambia la contraseña usando el token del correo
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, nuevaContrasena } = req.body;

  try {
    // Verifica que el token sea válido y no esté expirado
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JWTPayload;

    // Busca al usuario correspondiente al token
    const user = await Usuario.findByPk(decoded.id);
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    // Encripta la nueva contraseña y actualiza en la BD
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    await user.update({ contrasena: hashedPassword });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(" Error en resetPassword:", error);
    res.status(500).json({ message: "Token inválido o expirado" });
  }
};

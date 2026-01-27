import { Request, Response } from "express";
import Usuario from "../models/User";
import bcrypt from "bcryptjs";

// Obtener perfil del usuario autenticado
export const getProfile = async (req: Request, res: Response) => {
  try {
    // El id viene del middleware verifyToken
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = await Usuario.findByPk(userId, {
      attributes: { exclude: ["contrasena"] }, // Excluir contraseña
    });

    if (user) {
      console.log(
        "📄 Datos del usuario:",
        JSON.stringify(user.toJSON(), null, 2)
      );
    }

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Si el usuario está inactivo, no permitir acceso
    if (!user.estado) {
      return res.status(403).json({ message: "Cuenta inactiva" });
    }

    console.log("Enviando perfil al frontend");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el perfil" });
  }
};

// Actualizar perfil del usuario
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nombre, apellido, telefono } = req.body;

    // Validaciones básicas
    if (!nombre || !apellido) {
      return res
        .status(400)
        .json({ message: "Nombre y apellido son requeridos" });
    }

    const user = await Usuario.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.estado) {
      return res.status(403).json({ message: "Cuenta inactiva" });
    }

    // Actualizar los campos
    await user.update({
      nombre,
      apellido,
      telefono: telefono || null,
    });

    // Devolver el usuario actualizado sin la contraseña
    const updatedUser = await Usuario.findByPk(userId, {
      attributes: { exclude: ["contrasena"] },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error al actualizar el perfil" });
  }
};

// Cambiar contraseña
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nuevaContrasena, contrasenaActual } = req.body;

    if (!nuevaContrasena) {
      return res
        .status(400)
        .json({ message: "La nueva contraseña es requerida" });
    }

    // Validar longitud mínima
    if (nuevaContrasena.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    const user = await Usuario.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.estado) {
      return res.status(403).json({ message: "Cuenta inactiva" });
    }

    // Verificar la contraseña actual
    if (contrasenaActual) {
      const isValid = await bcrypt.compare(contrasenaActual, user.contrasena);

      if (!isValid) {
        return res.status(400).json({
          message: "La contraseña actual es incorrecta",
        });
      }
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    // Actualizar la contraseña
    await user.update({ contrasena: hashedPassword });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar la contraseña" });
  }
};

// Eliminar cuenta (soft delete - cambiar estado a false)
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const user = await Usuario.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // Soft delete - solo cambiar el estado a false
    await user.update({ estado: false });

    res.json({
      success: true,
      message: "Cuenta desactivada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({
      success: false,
      message: "Error al desactivar la cuenta",
    });
  }
};

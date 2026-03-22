import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Alerta from "../models/Alert";
import Usuario from "../models/User";
import { sequelize } from "../config/db";

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]{2,100}$/;
const PHONE_REGEX = /^\d{7,15}$/;

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = await Usuario.findByPk(userId, {
      attributes: { exclude: ["contrasena"] },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.estado) {
      return res.status(403).json({ message: "Cuenta inactiva" });
    }

    res.json(user);
  } catch {
    res.status(500).json({ message: "Error al obtener el perfil" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nombre, apellido, telefono } = req.body;
    const normalizedNombre = typeof nombre === "string" ? nombre.trim() : "";
    const normalizedApellido = typeof apellido === "string" ? apellido.trim() : "";
    const normalizedTelefono = typeof telefono === "string" ? telefono.trim() : "";

    if (!normalizedNombre || !normalizedApellido) {
      return res.status(400).json({ message: "Nombre y apellido son requeridos" });
    }

    if (!NAME_REGEX.test(normalizedNombre)) {
      return res.status(400).json({
        message:
          "El nombre solo puede contener letras, espacios, apostrofes o guiones, y debe tener al menos 2 caracteres",
      });
    }

    if (!NAME_REGEX.test(normalizedApellido)) {
      return res.status(400).json({
        message:
          "El apellido solo puede contener letras, espacios, apostrofes o guiones, y debe tener al menos 2 caracteres",
      });
    }

    if (normalizedTelefono && !PHONE_REGEX.test(normalizedTelefono)) {
      return res.status(400).json({
        message: "El telefono debe contener solo numeros y tener entre 7 y 15 digitos",
      });
    }

    const user = await Usuario.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.estado) {
      return res.status(403).json({ message: "Cuenta inactiva" });
    }

    await user.update({
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      telefono: normalizedTelefono || null,
    });

    const updatedUser = await Usuario.findByPk(userId, {
      attributes: { exclude: ["contrasena"] },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error al actualizar el perfil" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nuevaContrasena, contrasenaActual } = req.body;

    if (!nuevaContrasena) {
      return res.status(400).json({ message: "La nueva contrasena es requerida" });
    }

    if (nuevaContrasena.length < 6) {
      return res.status(400).json({
        message: "La contrasena debe tener al menos 6 caracteres",
      });
    }

    const user = await Usuario.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (!user.estado) {
      return res.status(403).json({ message: "Cuenta inactiva" });
    }

    if (contrasenaActual) {
      const isValid = await bcrypt.compare(contrasenaActual, user.contrasena);

      if (!isValid) {
        return res.status(400).json({
          message: "La contrasena actual es incorrecta",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    await user.update({ contrasena: hashedPassword });

    res.json({ message: "Contrasena actualizada correctamente" });
  } catch {
    res.status(500).json({ message: "Error al cambiar la contrasena" });
  }
};

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

    await sequelize.transaction(async (transaction) => {
      await Alerta.update(
        { id_usuario: null },
        {
          where: { id_usuario: userId },
          transaction,
          paranoid: false,
        }
      );

      await user.destroy({ transaction });
    });

    res.json({
      success: true,
      message: "Cuenta eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar la cuenta",
    });
  }
};

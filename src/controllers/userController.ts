// Gestionar usuarios como admin

import { Request, Response } from "express";
import Usuario from "../models/User";
import bcrypt from "bcryptjs";

// GET /api/users  -> listar todos los usuarios
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await Usuario.findAll({
      attributes: { exclude: ["contrasena"] },
    });
    res.json(users);
  } catch (error) {
    console.error("Error en getAllUsers:", error);
    res.status(500).json({ message: "Error al obtener los usuarios" });
  }
};

// POST /api/users  -> crear usuario como admin
export const createUserByAdmin = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, contrasena, telefono, id_rol } = req.body;

    if (!nombre || !apellido || !email || !contrasena) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const user = await Usuario.create({
      nombre,
      apellido,
      email,
      contrasena: hashedPassword,
      telefono: telefono || null,
      id_rol: id_rol || 2, // por defecto rol normal
      estado: true,
    });

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        id_rol: user.id_rol,
        estado: user.estado,
      },
    });
  } catch (error) {
    console.error("Error en createUserByAdmin:", error);
    res.status(500).json({ message: "Error al crear el usuario" });
  }
};

// PATCH /api/users/:id  -> editar datos básicos (no contraseña)
export const updateUserByAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, id_rol } = req.body;

    const user = await Usuario.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await user.update({
      nombre: nombre ?? user.nombre,
      apellido: apellido ?? user.apellido,
      telefono: telefono ?? user.telefono,
      id_rol: id_rol ?? user.id_rol,
    });

    const updated = await Usuario.findByPk(id, {
      attributes: { exclude: ["contrasena"] },
    });

    res.json({
      message: "Usuario actualizado correctamente",
      user: updated,
    });
  } catch (error) {
    console.error("Error en updateUserByAdmin:", error);
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
};

// PATCH /api/users/:id/status  -> activar / inactivar
export const changeUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // true o false

    if (estado === undefined) {
      return res.status(400).json({ message: "El campo estado es requerido" });
    }

    const user = await Usuario.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await user.update({ estado });

    res.json({
      message: `Usuario ${estado ? "activado" : "inactivado"} correctamente`,
    });
  } catch (error) {
    console.error("Error en changeUserStatus:", error);
    res.status(500).json({ message: "Error al cambiar el estado del usuario" });
  }
};

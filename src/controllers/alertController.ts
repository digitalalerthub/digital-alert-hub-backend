import { Request, Response } from "express";
import Alerta from "../models/Alert";
import cloudinary from "../config/cloudinary";
import Rol from "../models/Role";

const uploadEvidenceToCloudinary = async (file: Express.Multer.File) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary no configurado");
  }

  const base64 = file.buffer.toString("base64");
  const dataUri = `data:${file.mimetype};base64,${base64}`;
  const resourceType = file.mimetype.startsWith("video/") ? "video" : "image";

  return cloudinary.uploader.upload(dataUri, {
    folder: "digital-alert-hub/evidencias",
    resource_type: resourceType,
  });
};

export const createAlerta = async (req: Request, res: Response) => {
  try {
    const { titulo, descripcion, categoria, ubicacion, prioridad } = req.body;

    const id_usuario = (req as any).user?.id;

    if (!id_usuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    if (
      !titulo ||
      typeof titulo !== "string" ||
      !descripcion ||
      typeof descripcion !== "string" ||
      !categoria ||
      typeof categoria !== "string"
    ) {
      return res.status(400).json({
        message: "Los campos titulo, descripcion y categoria son obligatorios",
      });
    }

    if (titulo.trim().length === 0 || descripcion.trim().length === 0) {
      return res.status(400).json({
        message: "Titulo y descripcion no pueden estar vacios",
      });
    }

    let evidenciaUrl: string | undefined;
    let evidenciaTipo: string | undefined;

    if (req.file) {
      const uploaded = await uploadEvidenceToCloudinary(req.file);
      evidenciaUrl = uploaded.secure_url;
      evidenciaTipo = req.file.mimetype;
    }

    const newAlerta = await Alerta.create({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      ubicacion: typeof ubicacion === "string" ? ubicacion.trim() : undefined,
      prioridad: typeof prioridad === "string" ? prioridad.trim() : undefined,
      evidencia_url: evidenciaUrl,
      evidencia_tipo: evidenciaTipo,
      id_usuario,
      id_estado: 1,
    });

    res.status(201).json({ message: "Alerta creada con exito", alert: newAlerta });
  } catch (error) {
    console.error("Error al crear alerta:", error);
    res.status(500).json({ error: "Error al crear alerta" });
  }
};

export const listAlerta = async (_req: Request, res: Response) => {
  try {
    const alertas = await Alerta.findAll();
    res.json(alertas);
  } catch (error) {
    console.error("Error al obtener alertas:", error);
    res.status(500).json({ error: "Error al obtener las alertas" });
  }
};

export const updateAlerta = async (req: Request, res: Response) => {
  try {
    const idAlerta = Number(req.params.id);
    if (Number.isNaN(idAlerta)) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const alert = await Alerta.findByPk(idAlerta);
    if (!alert) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const role = await Rol.findByPk(user.rol);
    const roleName = String((role as any)?.nombre_rol || "").toLowerCase().trim();
    const isAdmin = roleName === "admin" || roleName === "administrador";

    if (!isAdmin && alert.id_usuario !== user.id) {
      return res.status(403).json({ message: "No puedes editar alertas de otros usuarios" });
    }

    // Regla de negocio: el creador solo puede editar si sigue en estado inicial.
    if (!isAdmin && alert.id_estado !== 1) {
      return res.status(403).json({
        message: "No puedes editar esta alerta porque la JAC ya cambio su estado",
      });
    }

    const { titulo, descripcion, categoria, ubicacion, prioridad } = req.body;

    if (typeof titulo === "string") {
      if (titulo.trim().length === 0) {
        return res.status(400).json({ message: "El titulo no puede estar vacio" });
      }
      alert.titulo = titulo.trim();
    }

    if (typeof descripcion === "string") {
      if (descripcion.trim().length === 0) {
        return res.status(400).json({ message: "La descripcion no puede estar vacia" });
      }
      alert.descripcion = descripcion.trim();
    }

    if (typeof categoria === "string") {
      if (categoria.trim().length === 0) {
        return res.status(400).json({ message: "La categoria no puede estar vacia" });
      }
      alert.categoria = categoria.trim();
    }

    if (typeof ubicacion === "string") {
      alert.ubicacion = ubicacion.trim();
    }

    if (typeof prioridad === "string") {
      alert.prioridad = prioridad.trim();
    }

    if (req.file) {
      const uploaded = await uploadEvidenceToCloudinary(req.file);
      alert.evidencia_url = uploaded.secure_url;
      alert.evidencia_tipo = req.file.mimetype;
    }

    await alert.save();
    res.json({ message: "Alerta actualizada con exito", alert });
  } catch (error) {
    console.error("Error al actualizar alerta:", error);
    res.status(500).json({ message: "Error al actualizar la alerta" });
  }
};

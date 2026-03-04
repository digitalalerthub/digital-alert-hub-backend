import { Request, Response } from "express";
import Alerta from "../models/Alert";
import cloudinary from "../config/cloudinary";
import Rol from "../models/Role";
import Barrio from "../models/Barrio";
import Comuna from "../models/Comuna"; // ← NUEVO
import Usuario from "../models/User";
import Evidence from "../models/Evidence";

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

type UploadedEvidence = {
  secureUrl: string;
  mimeType: string;
};

const getUploadedEvidenceFiles = (req: Request): Express.Multer.File[] => {
  const filesContainer = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | Express.Multer.File[]
    | undefined;

  if (!filesContainer) return [];
  if (Array.isArray(filesContainer)) return filesContainer;

  const multiFiles = filesContainer.evidencias ?? [];
  const legacyFiles = filesContainer.evidencia ?? [];
  return [...multiFiles, ...legacyFiles];
};

const validateEvidenceImages = (files: Express.Multer.File[]): string | null => {
  const hasInvalidMime = files.some((file) => !file.mimetype.startsWith("image/"));
  if (hasInvalidMime) {
    return "Solo se permiten imagenes en evidencias (JPG, PNG, WEBP)";
  }
  return null;
};

const uploadEvidenceBatch = async (files: Express.Multer.File[]): Promise<UploadedEvidence[]> => {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const uploaded = await uploadEvidenceToCloudinary(file);
      return {
        secureUrl: uploaded.secure_url,
        mimeType: file.mimetype,
      };
    })
  );
  return uploads;
};

const parseOptionalPositiveInt = (value: unknown): number | undefined | null => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

const isValidComunaBarrioPair = async (idComuna: number, idBarrio: number): Promise<boolean> => {
  const barrio = await Barrio.findOne({
    where: {
      id_barrio: idBarrio,
      id_comuna: idComuna,
    },
    attributes: ["id_barrio"],
  });
  return Boolean(barrio);
};

export const createAlerta = async (req: Request, res: Response) => {
  try {
    const { titulo, descripcion, categoria, ubicacion, prioridad, id_comuna, id_barrio } = req.body;

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

    const parsedComuna = parseOptionalPositiveInt(id_comuna);
    const parsedBarrio = parseOptionalPositiveInt(id_barrio);

    if (parsedComuna === null || parsedBarrio === null) {
      return res.status(400).json({ message: "Comuna y barrio deben ser numericos validos" });
    }

    if (!parsedComuna || !parsedBarrio) {
      return res.status(400).json({ message: "Comuna y barrio son obligatorios" });
    }

    const validPair = await isValidComunaBarrioPair(parsedComuna, parsedBarrio);
    if (!validPair) {
      return res.status(400).json({ message: "El barrio no pertenece a la comuna seleccionada" });
    }

    const evidenceFiles = getUploadedEvidenceFiles(req);
    const evidenceValidationError = validateEvidenceImages(evidenceFiles);
    if (evidenceValidationError) {
      return res.status(400).json({ message: evidenceValidationError });
    }

    const uploadedEvidence = await uploadEvidenceBatch(evidenceFiles);
    const firstEvidence = uploadedEvidence[0];

    const newAlerta = await Alerta.create({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      ubicacion: typeof ubicacion === "string" ? ubicacion.trim() : undefined,
      prioridad: typeof prioridad === "string" ? prioridad.trim() : undefined,
      id_comuna: parsedComuna,
      id_barrio: parsedBarrio,
      evidencia_url: firstEvidence?.secureUrl,
      evidencia_tipo: firstEvidence?.mimeType,
      id_usuario,
      id_estado: 1,
    });

    const createdEvidences =
      uploadedEvidence.length > 0
        ? await Evidence.bulkCreate(
            uploadedEvidence.map((item) => ({
              id_alerta: newAlerta.id_alerta,
              tipo_evidencia: item.mimeType,
              url_evidencia: item.secureUrl,
              created_by_id: id_usuario,
            })),
            { returning: true }
          )
        : [];

    res.status(201).json({
      message: "Alerta creada con exito",
      alert: {
        ...newAlerta.toJSON(),
        evidencias: createdEvidences.map((item) => ({
          id_evidencia: item.id_evidencia,
          url_evidencia: item.url_evidencia,
          tipo_evidencia: item.tipo_evidencia ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Error al crear alerta:", error);
    res.status(500).json({ error: "Error al crear alerta" });
  }
};

export const listAlerta = async (_req: Request, res: Response) => {
  try {
    const alertas = await Alerta.findAll();

    // IDs únicos de usuarios y comunas
    const userIds = Array.from(
      new Set(alertas.map((alerta) => alerta.id_usuario).filter((id) => Number.isInteger(id) && id > 0))
    );

    const comunaIds = Array.from(
      new Set(
        alertas
          .map((alerta) => alerta.id_comuna)
          .filter((id): id is number => id !== undefined && id !== null && Number.isInteger(id) && id > 0)
      )
    );

    // Consultas en paralelo
    const [usuarios, comunas] = await Promise.all([
      Usuario.findAll({
        where: { id_usuario: userIds },
        attributes: ["id_usuario", "nombre", "apellido"],
        raw: true,
      }),
      Comuna.findAll({
        where: { id_comuna: comunaIds },
        attributes: ["id_comuna", "nombre"],
        raw: true,
      }),
    ]);

    // Map nombre usuario por ID
    const userNameById = new Map<number, string>();
    for (const usuario of usuarios as Array<{ id_usuario: number; nombre: string; apellido: string }>) {
      const nombre = String(usuario.nombre || "").trim();
      const apellido = String(usuario.apellido || "").trim();
      const fullName = `${nombre} ${apellido}`.trim();
      if (!fullName) continue;
      userNameById.set(usuario.id_usuario, fullName);
    }

    // Map nombre comuna por ID
    const comunaNombreById = new Map<number, string>();
    for (const comuna of comunas as Array<{ id_comuna: number; nombre: string }>) {
      comunaNombreById.set(comuna.id_comuna, comuna.nombre);
    }

    // Evidencias
    const alertIds = alertas.map((alerta) => alerta.id_alerta);
    const evidencias =
      alertIds.length > 0
        ? await Evidence.findAll({
            where: { id_alerta: alertIds },
            order: [
              ["id_alerta", "ASC"],
              ["created_at", "ASC"],
            ],
            raw: true,
          })
        : [];

    const evidenceByAlert = new Map<
      number,
      Array<{ id_evidencia: number; url_evidencia: string; tipo_evidencia: string | null }>
    >();
    for (const evidence of evidencias as Array<{
      id_evidencia: number;
      id_alerta: number;
      tipo_evidencia: string | null;
      url_evidencia: string;
    }>) {
      const current = evidenceByAlert.get(evidence.id_alerta) || [];
      current.push({
        id_evidencia: evidence.id_evidencia,
        url_evidencia: evidence.url_evidencia,
        tipo_evidencia: evidence.tipo_evidencia ?? null,
      });
      evidenceByAlert.set(evidence.id_alerta, current);
    }

    const payload = alertas.map((alerta) => {
      const plain = alerta.toJSON();
      const idUsuario = Number(plain.id_usuario);
      const nombreUsuario = userNameById.get(idUsuario) || `Usuario #${idUsuario}`;
      const nombreComuna = plain.id_comuna
        ? comunaNombreById.get(plain.id_comuna) ?? `Comuna ${plain.id_comuna}`
        : undefined;
      const alertEvidence = evidenceByAlert.get(plain.id_alerta) || [];
      const primaryEvidence = alertEvidence[0];

      return {
        ...plain,
        nombre_usuario: nombreUsuario,
        nombre_comuna: nombreComuna, // ← NUEVO
        evidencia_url: plain.evidencia_url || primaryEvidence?.url_evidencia,
        evidencia_tipo: plain.evidencia_tipo || primaryEvidence?.tipo_evidencia || undefined,
        evidencias: alertEvidence,
      };
    });

    res.json(payload);
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

    if (!isAdmin && alert.id_estado !== 1) {
      return res.status(403).json({
        message: "No puedes editar esta alerta porque la JAC ya cambio su estado",
      });
    }

    const { titulo, descripcion, categoria, ubicacion, prioridad, id_comuna, id_barrio } = req.body;

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

    const parsedComuna = parseOptionalPositiveInt(id_comuna);
    const parsedBarrio = parseOptionalPositiveInt(id_barrio);

    if (parsedComuna === null || parsedBarrio === null) {
      return res.status(400).json({ message: "Comuna y barrio deben ser numericos validos" });
    }

    if (parsedComuna !== undefined || parsedBarrio !== undefined) {
      const nextComuna = parsedComuna ?? alert.id_comuna;
      const nextBarrio = parsedBarrio ?? alert.id_barrio;

      if (!nextComuna || !nextBarrio) {
        return res.status(400).json({
          message: "Debes enviar comuna y barrio validos para actualizar la ubicacion administrativa",
        });
      }

      const validPair = await isValidComunaBarrioPair(nextComuna, nextBarrio);
      if (!validPair) {
        return res.status(400).json({ message: "El barrio no pertenece a la comuna seleccionada" });
      }

      alert.id_comuna = nextComuna;
      alert.id_barrio = nextBarrio;
    }

    const evidenceFiles = getUploadedEvidenceFiles(req);
    let uploadedEvidence: UploadedEvidence[] = [];
    if (evidenceFiles.length > 0) {
      const evidenceValidationError = validateEvidenceImages(evidenceFiles);
      if (evidenceValidationError) {
        return res.status(400).json({ message: evidenceValidationError });
      }

      uploadedEvidence = await uploadEvidenceBatch(evidenceFiles);
      const firstEvidence = uploadedEvidence[0];

      alert.evidencia_url = firstEvidence?.secureUrl;
      alert.evidencia_tipo = firstEvidence?.mimeType;
    }

    await alert.save();

    if (evidenceFiles.length > 0) {
      await Evidence.destroy({
        where: { id_alerta: alert.id_alerta },
      });

      await Evidence.bulkCreate(
        uploadedEvidence.map((item) => ({
          id_alerta: alert.id_alerta,
          tipo_evidencia: item.mimeType,
          url_evidencia: item.secureUrl,
          created_by_id: user.id,
        }))
      );
    }

    const alertEvidences = await Evidence.findAll({
      where: { id_alerta: alert.id_alerta },
      order: [["created_at", "ASC"]],
      raw: true,
    });

    res.json({
      message: "Alerta actualizada con exito",
      alert: {
        ...alert.toJSON(),
        evidencias: alertEvidences.map((item: any) => ({
          id_evidencia: item.id_evidencia,
          url_evidencia: item.url_evidencia,
          tipo_evidencia: item.tipo_evidencia ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Error al actualizar alerta:", error);
    res.status(500).json({ message: "Error al actualizar la alerta" });
  }
};
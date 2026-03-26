import { sequelize } from "../../config/db";
import Alerta from "../../models/Alert";
import Evidence from "../../models/Evidence";
import HistorialEstado from "../../models/HistorialEstado";
import { resolveAlertCategoryCatalogRecord } from "../../utils/categoryUtils";
import {
  getAlertWorkflowStateIds,
  hasRestrictedAlertFieldChanges,
  isValidComunaBarrioPair,
  parseBooleanFlag,
  parseEvidenceIdsToDelete,
  parseOptionalPositiveInt,
} from "../../utils/alertUtils";
import { AppError } from "../../utils/appError";
import {
  type UploadedEvidence,
  uploadEvidenceBatch,
  validateEvidenceImages,
} from "./alertEvidenceService";

type CreateAlertInput = {
  body: Record<string, unknown>;
  userId: number;
  evidenceFiles: Express.Multer.File[];
};

type UpdateAlertInput = {
  alert: Alerta;
  body: Record<string, unknown>;
  userId: number;
  isAdmin: boolean;
  evidenceFiles: Express.Multer.File[];
};

const ensureWorkflowStateIds = async () => {
  const workflowStateIds = await getAlertWorkflowStateIds();

  if (!workflowStateIds) {
    throw new AppError(
      500,
      "La tabla estados no contiene el workflow requerido para alertas"
    );
  }

  return workflowStateIds;
};

const syncPrimaryEvidenceFields = async (alert: Alerta): Promise<void> => {
  const alertEvidences = await Evidence.findAll({
    where: { id_alerta: alert.id_alerta },
    order: [["created_at", "ASC"]],
    raw: true,
  });

  const firstEvidence = alertEvidences[0] as
    | { url_evidencia: string; tipo_evidencia: string | null }
    | undefined;

  (alert as any).evidencia_url = firstEvidence?.url_evidencia ?? null;
  (alert as any).evidencia_tipo = firstEvidence?.tipo_evidencia ?? null;
};

export const createAlertRecord = async ({
  body,
  userId,
  evidenceFiles,
}: CreateAlertInput): Promise<Alerta> => {
  const {
    titulo,
    descripcion,
    categoria,
    id_categoria,
    ubicacion,
    prioridad,
    id_comuna,
    id_barrio,
  } = body;

  if (!titulo || typeof titulo !== "string" || !descripcion || typeof descripcion !== "string") {
    throw new AppError(
      400,
      "Los campos titulo, descripcion y categoria son obligatorios"
    );
  }

  if (titulo.trim().length === 0 || descripcion.trim().length === 0) {
    throw new AppError(400, "Titulo y descripcion no pueden estar vacios");
  }

  if (typeof ubicacion !== "string" || ubicacion.trim().length === 0) {
    throw new AppError(400, "La direccion es obligatoria");
  }

  const resolvedCategory = await resolveAlertCategoryCatalogRecord(id_categoria, categoria);
  if (!resolvedCategory) {
    throw new AppError(400, "La categoria enviada no existe en la tabla categorias");
  }

  const parsedComuna = parseOptionalPositiveInt(id_comuna);
  const parsedBarrio = parseOptionalPositiveInt(id_barrio);

  if (parsedComuna === null || parsedBarrio === null) {
    throw new AppError(400, "Comuna y barrio deben ser numericos validos");
  }

  if (!parsedComuna || !parsedBarrio) {
    throw new AppError(400, "Comuna y barrio son obligatorios");
  }

  const validPair = await isValidComunaBarrioPair(parsedComuna, parsedBarrio);
  if (!validPair) {
    throw new AppError(400, "El barrio no pertenece a la comuna seleccionada");
  }

  if (evidenceFiles.length === 0) {
    throw new AppError(400, "Debes adjuntar al menos una evidencia");
  }

  const evidenceValidationError = validateEvidenceImages(evidenceFiles);
  if (evidenceValidationError) {
    throw new AppError(400, evidenceValidationError);
  }

  const workflowStateIds = await ensureWorkflowStateIds();
  const uploadedEvidence = await uploadEvidenceBatch(evidenceFiles);
  const firstEvidence = uploadedEvidence[0];

  let newAlert: Alerta | null = null;

  await sequelize.transaction(async (transaction) => {
    newAlert = await Alerta.create(
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        id_categoria: resolvedCategory.id_categoria,
        categoria: resolvedCategory.label,
        ubicacion: ubicacion.trim(),
        prioridad: typeof prioridad === "string" ? prioridad.trim() : undefined,
        id_comuna: parsedComuna,
        id_barrio: parsedBarrio,
        evidencia_url: firstEvidence?.secureUrl,
        evidencia_tipo: firstEvidence?.mimeType,
        id_usuario: userId,
        id_estado: workflowStateIds.pendiente,
      },
      { transaction }
    );

    if (uploadedEvidence.length > 0) {
      await Evidence.bulkCreate(
        uploadedEvidence.map((item) => ({
          id_alerta: newAlert!.id_alerta,
          tipo_evidencia: item.mimeType,
          url_evidencia: item.secureUrl,
          created_by_id: userId,
        })),
        { returning: true, transaction }
      );
    }

    await HistorialEstado.create(
      {
        id_alerta: newAlert!.id_alerta,
        id_estado: workflowStateIds.pendiente,
        created_by_id: userId,
      },
      { transaction }
    );
  });

  if (!newAlert) {
    throw new AppError(500, "No se pudo crear la alerta");
  }

  return newAlert;
};

export const updateAlertRecord = async ({
  alert,
  body,
  userId,
  isAdmin,
  evidenceFiles,
}: UpdateAlertInput): Promise<Alerta> => {
  const isOwner = alert.id_usuario === userId;
  const workflowStateIds = await ensureWorkflowStateIds();

  if (!isAdmin && !isOwner) {
    throw new AppError(403, "No puedes editar alertas de otros usuarios");
  }

  const ownerEvidenceOnlyMode =
    !isAdmin && isOwner && alert.id_estado === workflowStateIds.en_progreso;
  const ownerLockedMode =
    !isAdmin &&
    isOwner &&
    [workflowStateIds.resuelta, workflowStateIds.falsa_alerta].includes(alert.id_estado);

  if (ownerLockedMode) {
    throw new AppError(
      403,
      "No puedes modificar esta alerta porque ya fue marcada como resuelta o falsa alerta"
    );
  }

  if (!isAdmin && !ownerEvidenceOnlyMode && alert.id_estado !== workflowStateIds.pendiente) {
    throw new AppError(
      403,
      "No puedes editar esta alerta porque la JAC ya cambio su estado"
    );
  }

  if (ownerEvidenceOnlyMode) {
    if (hasRestrictedAlertFieldChanges(body)) {
      throw new AppError(
        403,
        "Cuando la alerta esta en progreso solo puedes agregar nuevas evidencias"
      );
    }

    if (evidenceFiles.length === 0) {
      throw new AppError(
        400,
        "Agrega al menos una nueva evidencia para actualizar una alerta en progreso"
      );
    }
  }

  const {
    titulo,
    descripcion,
    categoria,
    id_categoria,
    ubicacion,
    prioridad,
    id_comuna,
    id_barrio,
  } = body;

  if (!ownerEvidenceOnlyMode && typeof titulo === "string") {
    if (titulo.trim().length === 0) {
      throw new AppError(400, "El titulo no puede estar vacio");
    }
    alert.titulo = titulo.trim();
  }

  if (!ownerEvidenceOnlyMode && typeof descripcion === "string") {
    if (descripcion.trim().length === 0) {
      throw new AppError(400, "La descripcion no puede estar vacia");
    }
    alert.descripcion = descripcion.trim();
  }

  if (!ownerEvidenceOnlyMode && (id_categoria !== undefined || categoria !== undefined)) {
    const resolvedCategory = await resolveAlertCategoryCatalogRecord(id_categoria, categoria);
    if (!resolvedCategory) {
      throw new AppError(400, "La categoria enviada no existe en la tabla categorias");
    }

    alert.id_categoria = resolvedCategory.id_categoria;
    alert.categoria = resolvedCategory.label;
  }

  if (!ownerEvidenceOnlyMode && typeof ubicacion === "string") {
    alert.ubicacion = ubicacion.trim();
  }

  if (!ownerEvidenceOnlyMode && typeof prioridad === "string") {
    alert.prioridad = prioridad.trim();
  }

  const parsedComuna = ownerEvidenceOnlyMode ? undefined : parseOptionalPositiveInt(id_comuna);
  const parsedBarrio = ownerEvidenceOnlyMode ? undefined : parseOptionalPositiveInt(id_barrio);

  if (parsedComuna === null || parsedBarrio === null) {
    throw new AppError(400, "Comuna y barrio deben ser numericos validos");
  }

  if (parsedComuna !== undefined || parsedBarrio !== undefined) {
    const nextComuna = parsedComuna ?? alert.id_comuna;
    const nextBarrio = parsedBarrio ?? alert.id_barrio;

    if (!nextComuna || !nextBarrio) {
      throw new AppError(
        400,
        "Debes enviar comuna y barrio validos para actualizar la ubicacion administrativa"
      );
    }

    const validPair = await isValidComunaBarrioPair(nextComuna, nextBarrio);
    if (!validPair) {
      throw new AppError(400, "El barrio no pertenece a la comuna seleccionada");
    }

    alert.id_comuna = nextComuna;
    alert.id_barrio = nextBarrio;
  }

  const evidenceIdsToDelete = parseEvidenceIdsToDelete(body.evidencias_eliminadas);
  if (evidenceIdsToDelete === null) {
    throw new AppError(400, "La lista de evidencias a eliminar es invalida");
  }

  const deleteAllEvidence = parseBooleanFlag(body.eliminar_todas_evidencias);
  if (evidenceFiles.length > 0) {
    const evidenceValidationError = validateEvidenceImages(evidenceFiles);
    if (evidenceValidationError) {
      throw new AppError(400, evidenceValidationError);
    }
  }

  let uploadedEvidence: UploadedEvidence[] = [];
  if (evidenceFiles.length > 0) {
    uploadedEvidence = await uploadEvidenceBatch(evidenceFiles);
  }

  if (deleteAllEvidence) {
    await Evidence.destroy({
      where: { id_alerta: alert.id_alerta },
    });
  } else if (evidenceIdsToDelete.length > 0) {
    const existingEvidence = await Evidence.findAll({
      where: {
        id_alerta: alert.id_alerta,
        id_evidencia: evidenceIdsToDelete,
      },
      attributes: ["id_evidencia"],
      raw: true,
    });

    if (existingEvidence.length !== evidenceIdsToDelete.length) {
      throw new AppError(
        400,
        "Una o mas evidencias a eliminar no pertenecen a la alerta"
      );
    }

    await Evidence.destroy({
      where: {
        id_alerta: alert.id_alerta,
        id_evidencia: evidenceIdsToDelete,
      },
    });
  }

  if (uploadedEvidence.length > 0) {
    await Evidence.bulkCreate(
      uploadedEvidence.map((item) => ({
        id_alerta: alert.id_alerta,
        tipo_evidencia: item.mimeType,
        url_evidencia: item.secureUrl,
        created_by_id: userId,
      }))
    );
  }

  const evidenceOperationRequested =
    deleteAllEvidence || evidenceIdsToDelete.length > 0 || uploadedEvidence.length > 0;

  if (evidenceOperationRequested) {
    await syncPrimaryEvidenceFields(alert);
  }

  await alert.save();
  return alert;
};

export const deleteAlertRecord = async ({
  alert,
  userId,
  isAdmin,
}: {
  alert: Alerta;
  userId: number;
  isAdmin: boolean;
}): Promise<void> => {
  const workflowStateIds = await ensureWorkflowStateIds();

  if (!isAdmin && alert.id_usuario !== userId) {
    throw new AppError(403, "No puedes eliminar alertas de otros usuarios");
  }

  if (!isAdmin && alert.id_estado !== workflowStateIds.pendiente) {
    throw new AppError(
      403,
      alert.id_estado === workflowStateIds.en_progreso
        ? "No puedes eliminar esta alerta porque ya esta en progreso"
        : "No puedes eliminar esta alerta porque ya fue marcada como resuelta o falsa alerta"
    );
  }

  await alert.destroy();
};

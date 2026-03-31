import { Request, Response } from "express";
import { col, fn } from "sequelize";
import Alerta from "../../models/alerts/Alert";
import AlertReaction from "../../models/alerts/AlertReaction";
import {
  getUploadedEvidenceFiles,
  isMissingCloudinaryConfigurationError,
} from "../../services/alerts/alertEvidenceService";
import {
  createAlertRecord,
  deleteAlertRecord,
  updateAlertRecord,
} from "../../services/alerts/alertMutationService";
import { buildAlertPayloads } from "../../services/alerts/alertPayloadService";
import {
  getAlertWorkflowStateIds,
  getPriorityWeight,
  getStatusWeight,
  isRequestAdmin,
} from "../../utils/alertUtils";
import { isAppError } from "../../utils/appError";
import { parsePositiveInt } from "../../utils/number";

type ReactionAggregateRow = {
  id_alerta: number;
  total: string;
};

export const createAlerta = async (req: Request, res: Response) => {
  try {
    const id_usuario = parsePositiveInt(req.user?.id);

    if (!id_usuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const evidenceFiles = getUploadedEvidenceFiles(req);
    const createdAlert = await createAlertRecord({
      body: req.body,
      userId: id_usuario,
      evidenceFiles,
    });
    const [createdAlertPayload] = await buildAlertPayloads([createdAlert]);

    res.status(201).json({
      message: "Alerta creada con exito",
      alert: createdAlertPayload,
    });
  } catch (error) {
    console.error("Error al crear alerta:", error);
    if (isMissingCloudinaryConfigurationError(error)) {
      return res.status(503).json({
        message:
          "El servicio de evidencias no esta configurado en el backend. Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.",
      });
    }
    if (isAppError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ error: "Error al crear alerta" });
  }
};

export const listFeaturedAlertas = async (_req: Request, res: Response) => {
  try {
    const workflowStateIds = await getAlertWorkflowStateIds();
    if (!workflowStateIds) {
      return res.status(500).json({
        message: "La tabla estados no contiene el workflow requerido para alertas",
      });
    }

    const alertas = await Alerta.findAll({
      where: {
        id_estado: [
          workflowStateIds.pendiente,
          workflowStateIds.en_progreso,
          workflowStateIds.resuelta,
        ],
      },
      order: [["created_at", "DESC"]],
      limit: 60,
    });

    if (alertas.length === 0) {
      return res.json([]);
    }

    const reactionRowsRaw = await AlertReaction.findAll({
      attributes: ["id_alerta", [fn("COUNT", col("id_alerta_reaccion")), "total"]],
      where: {
        id_alerta: alertas.map((alerta) => alerta.id_alerta),
      },
      group: ["id_alerta"],
      raw: true,
    });

    const reactionRows = reactionRowsRaw as unknown as ReactionAggregateRow[];
    const reactionCountByAlertId = new Map<number, number>();
    for (const row of reactionRows) {
      reactionCountByAlertId.set(row.id_alerta, Number(row.total) || 0);
    }

    const featuredAlertas = [...alertas]
      .sort((a, b) => {
        const reactionDiff =
          (reactionCountByAlertId.get(b.id_alerta) ?? 0) -
          (reactionCountByAlertId.get(a.id_alerta) ?? 0);
        if (reactionDiff !== 0) return reactionDiff;

        const priorityDiff =
          getPriorityWeight(b.prioridad) - getPriorityWeight(a.prioridad);
        if (priorityDiff !== 0) return priorityDiff;

        const statusDiff =
          getStatusWeight(b.id_estado, workflowStateIds) -
          getStatusWeight(a.id_estado, workflowStateIds);
        if (statusDiff !== 0) return statusDiff;

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      })
      .slice(0, 5);

    const payload = await buildAlertPayloads(featuredAlertas);
    const enrichedPayload = payload.map((alerta) => ({
      ...alerta,
      total_reacciones: reactionCountByAlertId.get(alerta.id_alerta) ?? 0,
    }));

    return res.json(enrichedPayload);
  } catch (error) {
    console.error("Error al obtener alertas destacadas:", error);
    return res.status(500).json({ message: "Error al obtener alertas destacadas" });
  }
};

export const listAlerta = async (_req: Request, res: Response) => {
  try {
    const alertas = await Alerta.findAll();
    const payload = await buildAlertPayloads(alertas);
    res.json(payload);
  } catch (error) {
    console.error("Error al obtener alertas:", error);
    res.status(500).json({ error: "Error al obtener las alertas" });
  }
};

export const getAlertaById = async (req: Request, res: Response) => {
  try {
    const idAlerta = Number(req.params.id);
    if (Number.isNaN(idAlerta)) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const alert = await Alerta.findByPk(idAlerta);
    if (!alert) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    const [payload] = await buildAlertPayloads([alert]);
    return res.json(payload);
  } catch (error) {
    console.error("Error al obtener detalle de alerta:", error);
    return res.status(500).json({ message: "Error al obtener detalle de alerta" });
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

    const user = req.user;
    const userId = parsePositiveInt(user?.id);
    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const isAdmin = await isRequestAdmin(req);
    const evidenceFiles = getUploadedEvidenceFiles(req);
    await updateAlertRecord({
      alert,
      body: req.body,
      userId,
      isAdmin,
      evidenceFiles,
    });

    const [updatedAlertPayload] = await buildAlertPayloads([alert]);

    res.json({
      message: "Alerta actualizada con exito",
      alert: updatedAlertPayload,
    });
  } catch (error) {
    console.error("Error al actualizar alerta:", error);
    if (isMissingCloudinaryConfigurationError(error)) {
      return res.status(503).json({
        message:
          "El servicio de evidencias no esta configurado en el backend. Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.",
      });
    }
    if (isAppError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Error al actualizar la alerta" });
  }
};

export const deleteAlerta = async (req: Request, res: Response) => {
  try {
    const idAlerta = Number(req.params.id);
    if (Number.isNaN(idAlerta)) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const alert = await Alerta.findByPk(idAlerta);
    if (!alert) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    const user = req.user;
    const userId = parsePositiveInt(user?.id);
    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const isAdmin = await isRequestAdmin(req);
    await deleteAlertRecord({
      alert,
      userId,
      isAdmin,
    });

    return res.json({
      message: "Alerta eliminada con exito",
      id_alerta: alert.id_alerta,
    });
  } catch (error) {
    console.error("Error al eliminar alerta:", error);
    if (isAppError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Error al eliminar la alerta" });
  }
};

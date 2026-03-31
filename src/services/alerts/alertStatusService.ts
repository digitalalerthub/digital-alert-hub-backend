import { Request } from "express";
import { sequelize } from "../../config/db";
import Alert from "../../models/alerts/Alert";
import HistorialEstado from "../../models/alerts/HistorialEstado";
import { AppError } from "../../utils/appError";
import { parsePositiveInt } from "../../utils/number";
import {
  isAdminRoleName,
  isJacRoleName,
  resolveCanonicalRoleName,
} from "../../utils/roleUtils";
import { resolveRequiredStateIds } from "../../utils/stateUtils";

const ALERT_WORKFLOW_STATE_NAMES = [
  "pendiente",
  "en_progreso",
  "resuelta",
  "falsa_alerta",
] as const;

const isAuthorized = async (req: Request): Promise<boolean> => {
  const canonicalRoleName = await resolveCanonicalRoleName(
    req.user?.rol,
    req.user?.role_name
  );

  return isAdminRoleName(canonicalRoleName) || isJacRoleName(canonicalRoleName);
};

export const updateAlertStatus = async (req: Request) => {
  const alertId = parsePositiveInt(req.params.id);
  if (!alertId) {
    throw new AppError(400, "ID de alerta invalido");
  }

  const userId = parsePositiveInt(req.user?.id);
  if (!userId) {
    throw new AppError(401, "No autenticado");
  }

  if (!(await isAuthorized(req))) {
    throw new AppError(
      403,
      "No tienes permisos para cambiar el estado de una alerta"
    );
  }

  const workflowStateIds = await resolveRequiredStateIds(ALERT_WORKFLOW_STATE_NAMES);
  if (!workflowStateIds) {
    throw new AppError(
      500,
      "La tabla estados no contiene el workflow requerido para alertas"
    );
  }

  const validStateIds = Object.values(workflowStateIds);
  const nextState = parsePositiveInt(req.body?.id_estado);
  if (!nextState || !validStateIds.includes(nextState)) {
    throw new AppError(
      400,
      "id_estado debe corresponder a un estado valido del workflow configurado en la base"
    );
  }

  let previousState: number | null = null;
  let updatedAlert: ReturnType<Alert["toJSON"]> | null = null;

  await sequelize.transaction(async (transaction) => {
    const alert = await Alert.findByPk(alertId, { transaction });
    if (!alert) {
      throw new AppError(404, "Alerta no encontrada");
    }

    if (alert.id_estado === nextState) {
      previousState = alert.id_estado;
      updatedAlert = alert.toJSON();
      return;
    }

    previousState = alert.id_estado;
    alert.id_estado = nextState;
    await alert.save({ transaction });

    await HistorialEstado.create(
      {
        id_alerta: alert.id_alerta,
        id_estado: nextState,
        created_by_id: userId,
      },
      { transaction }
    );

    updatedAlert = alert.toJSON();
  });

  if (!updatedAlert) {
    throw new AppError(404, "Alerta no encontrada");
  }

  if (previousState === nextState) {
    return {
      statusCode: 200,
      body: {
        message: "La alerta ya tiene ese estado",
        alert: updatedAlert,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      message: "Estado actualizado con exito",
      estado_anterior: previousState,
      alert: updatedAlert,
    },
  };
};

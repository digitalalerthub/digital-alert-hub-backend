import Alert from "../../models/alerts/Alert";
import User from "../../models/users/User";
import { AppError } from "../../utils/appError";
import { resolveRequiredStateIds } from "../../utils/stateUtils";

export const getPlatformStats = async () => {
  const workflowStateIds = await resolveRequiredStateIds([
    "pendiente",
    "resuelta",
  ]);

  if (!workflowStateIds) {
    throw new AppError(
      500,
      "La tabla estados no contiene el workflow requerido para estadisticas"
    );
  }

  const ciudadanos = await User.count();
  const alertasTotales = await Alert.count();
  const alertasResueltas = await Alert.count({
    where: { id_estado: workflowStateIds.resuelta },
  });
  const alertasPendientes = await Alert.count({
    where: { id_estado: workflowStateIds.pendiente },
  });

  return {
    ciudadanos,
    alertasTotales,
    alertasAtendidas: alertasResueltas,
    alertasResueltas,
    alertasPendientes,
  };
};

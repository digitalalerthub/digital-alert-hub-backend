import bcrypt from "bcryptjs";
import { sequelize } from "../../config/db";
import Alert from "../../models/alerts/Alert";
import User from "../../models/users/User";
import { AppError } from "../../utils/appError";
import {
  normalizeName,
  normalizePhone,
  validateName,
  validatePassword,
  validatePhone,
} from "../../utils/userValidation";

const getRequestUserId = (user: unknown): number | null => {
  const parsed = Number((user as any)?.id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getActiveUserByRequest = async (user: unknown) => {
  const userId = getRequestUserId(user);
  if (!userId) {
    throw new AppError(401, "No autenticado");
  }

  const foundUser = await User.findByPk(userId);
  if (!foundUser) {
    throw new AppError(404, "Usuario no encontrado");
  }

  if (!foundUser.estado) {
    throw new AppError(403, "Cuenta inactiva");
  }

  return foundUser;
};

export const getProfileData = async (requestUser: unknown) => {
  const user = await getActiveUserByRequest(requestUser);
  const safeUser = await User.findByPk(user.id_usuario, {
    attributes: { exclude: ["contrasena"] },
  });

  if (!safeUser) {
    throw new AppError(404, "Usuario no encontrado");
  }

  return safeUser;
};

export const updateProfileData = async (
  requestUser: unknown,
  payload: { nombre?: unknown; apellido?: unknown; telefono?: unknown }
) => {
  const user = await getActiveUserByRequest(requestUser);
  const normalizedNombre = normalizeName(payload.nombre);
  const normalizedApellido = normalizeName(payload.apellido);
  const normalizedTelefono = normalizePhone(payload.telefono);

  if (!normalizedNombre || !normalizedApellido) {
    throw new AppError(400, "Nombre y apellido son requeridos");
  }

  const nombreError = validateName(normalizedNombre, "nombre");
  const apellidoError = validateName(normalizedApellido, "apellido");
  const telefonoError = validatePhone(normalizedTelefono);

  if (nombreError || apellidoError || telefonoError) {
    throw new AppError(
      400,
      nombreError || apellidoError || telefonoError || "Datos invalidos"
    );
  }

  await user.update({
    nombre: normalizedNombre,
    apellido: normalizedApellido,
    telefono: normalizedTelefono || null,
  });

  const updatedUser = await User.findByPk(user.id_usuario, {
    attributes: { exclude: ["contrasena"] },
  });

  if (!updatedUser) {
    throw new AppError(404, "Usuario no encontrado");
  }

  return updatedUser;
};

export const changeUserPassword = async (
  requestUser: unknown,
  payload: { nuevaContrasena?: unknown; contrasenaActual?: unknown }
) => {
  const user = await getActiveUserByRequest(requestUser);
  const newPassword =
    typeof payload.nuevaContrasena === "string" ? payload.nuevaContrasena : "";
  const currentPassword =
    typeof payload.contrasenaActual === "string" ? payload.contrasenaActual : "";

  if (!newPassword) {
    throw new AppError(400, "La nueva contrasena es requerida");
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new AppError(400, passwordError);
  }

  if (currentPassword) {
    const isValid = await bcrypt.compare(currentPassword, user.contrasena);
    if (!isValid) {
      throw new AppError(400, "La contrasena actual es incorrecta");
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ contrasena: hashedPassword });
};

export const deleteOwnAccount = async (requestUser: unknown) => {
  const user = await getActiveUserByRequest(requestUser);
  const userId = user.id_usuario;

  await sequelize.transaction(async (transaction) => {
    await Alert.update(
      { id_usuario: null },
      {
        where: { id_usuario: userId },
        transaction,
        paranoid: false,
      }
    );

    await user.destroy({ transaction });
  });
};

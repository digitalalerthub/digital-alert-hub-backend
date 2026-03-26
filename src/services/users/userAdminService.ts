import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { sequelize } from "../../config/db";
import User from "../../models/User";
import { buildPasswordActionLink } from "../auth/authLinkService";
import { sendAccountSetupEmail } from "../auth/authMailService";
import { AppError } from "../../utils/appError";
import { parsePositiveInt } from "../../utils/number";
import { resolveRoleIdByCanonicalName } from "../../utils/roleUtils";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  validateEmail,
  validateName,
  validatePhone,
} from "../../utils/userValidation";

type CreateUserPayload = {
  nombre?: unknown;
  apellido?: unknown;
  email?: unknown;
  telefono?: unknown;
  id_rol?: unknown;
};

type UpdateUserPayload = {
  nombre?: unknown;
  apellido?: unknown;
  telefono?: unknown;
  id_rol?: unknown;
};

export const listUsersForAdmin = async () =>
  User.findAll({
    attributes: { exclude: ["contrasena"] },
  });

export const createUserFromAdmin = async (payload: CreateUserPayload) => {
  const normalizedNombre = normalizeName(payload.nombre);
  const normalizedApellido = normalizeName(payload.apellido);
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedTelefono = normalizePhone(payload.telefono);

  if (!normalizedNombre || !normalizedApellido || !normalizedEmail) {
    throw new AppError(400, "Faltan datos obligatorios");
  }

  const nombreError = validateName(normalizedNombre, "nombre");
  const apellidoError = validateName(normalizedApellido, "apellido");
  const emailError = validateEmail(normalizedEmail);
  const telefonoError = validatePhone(normalizedTelefono);

  if (nombreError || apellidoError || emailError || telefonoError) {
    throw new AppError(
      400,
      nombreError || apellidoError || emailError || telefonoError || "Datos invalidos"
    );
  }

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError(409, "El correo ya esta registrado");
  }

  const requestedRoleId = parsePositiveInt(payload.id_rol);
  if (
    payload.id_rol !== undefined &&
    payload.id_rol !== null &&
    payload.id_rol !== "" &&
    !requestedRoleId
  ) {
    throw new AppError(400, "El rol seleccionado no es valido");
  }

  const defaultCitizenRoleId = await resolveRoleIdByCanonicalName("ciudadano");
  if (!defaultCitizenRoleId) {
    throw new AppError(
      500,
      "El rol Ciudadano no esta configurado en la base de datos"
    );
  }

  const temporaryPassword = randomBytes(24).toString("hex");
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  const user = await sequelize.transaction(async (transaction) => {
    const createdUser = await User.create(
      {
        nombre: normalizedNombre,
        apellido: normalizedApellido,
        email: normalizedEmail,
        contrasena: hashedPassword,
        telefono: normalizedTelefono || null,
        id_rol: requestedRoleId ?? defaultCitizenRoleId,
        estado: false,
        email_verificado: false,
      },
      { transaction }
    );

    const setupLink = buildPasswordActionLink(createdUser, "set_password");
    await sendAccountSetupEmail(
      createdUser.email,
      createdUser.nombre,
      setupLink
    );

    return createdUser;
  });

  return {
    message:
      "Usuario creado correctamente. Se envio un correo para activar la cuenta y definir la contrasena.",
    user: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      id_rol: user.id_rol,
      estado: user.estado,
    },
  };
};

export const updateUserFromAdmin = async (
  userIdParam: string,
  payload: UpdateUserPayload
) => {
  const normalizedNombre = normalizeName(payload.nombre);
  const normalizedApellido = normalizeName(payload.apellido);
  const normalizedTelefono = normalizePhone(payload.telefono);
  const requestedRoleId = parsePositiveInt(payload.id_rol);

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

  if (
    payload.id_rol !== undefined &&
    payload.id_rol !== null &&
    payload.id_rol !== "" &&
    !requestedRoleId
  ) {
    throw new AppError(400, "El rol seleccionado no es valido");
  }

  const user = await User.findByPk(userIdParam);
  if (!user) {
    throw new AppError(404, "Usuario no encontrado");
  }

  await user.update({
    nombre: normalizedNombre,
    apellido: normalizedApellido,
    telefono: normalizedTelefono || null,
    id_rol: requestedRoleId ?? user.id_rol,
  });

  const updatedUser = await User.findByPk(userIdParam, {
    attributes: { exclude: ["contrasena"] },
  });

  return {
    message: "Usuario actualizado correctamente",
    user: updatedUser,
  };
};

export const changeManagedUserStatus = async (
  userIdParam: string,
  estado: unknown
) => {
  if (estado === undefined) {
    throw new AppError(400, "El campo estado es requerido");
  }

  if (typeof estado !== "boolean") {
    throw new AppError(400, "El campo estado debe ser booleano");
  }

  const user = await User.findByPk(userIdParam);
  if (!user) {
    throw new AppError(404, "Usuario no encontrado");
  }

  await user.update({ estado });

  return {
    message: `Usuario ${estado ? "activado" : "inactivado"} correctamente`,
  };
};

import { ForeignKeyConstraintError } from "sequelize";
import Role from "../../models/users/Role";
import User from "../../models/users/User";
import { AppError } from "../../utils/appError";

type RoleUsage = {
  id_rol: number;
  nombre_rol: string;
  usuarios_asignados: number;
};

const countAssignedUsers = async (roleId: number) =>
  User.count({
    where: { id_rol: roleId },
  });

export const listRolesWithUsage = async (): Promise<RoleUsage[]> => {
  const roles = await Role.findAll({
    order: [["id_rol", "ASC"]],
    attributes: ["id_rol", "nombre_rol"],
  });

  const usageCounts = await Promise.all(
    roles.map(async (role) => ({
      id_rol: role.id_rol,
      usuarios_asignados: await countAssignedUsers(role.id_rol),
    }))
  );

  const usageMap = new Map(
    usageCounts.map(({ id_rol, usuarios_asignados }) => [
      id_rol,
      usuarios_asignados,
    ])
  );

  return roles.map((role) => ({
    id_rol: role.id_rol,
    nombre_rol: role.nombre_rol,
    usuarios_asignados: usageMap.get(role.id_rol) ?? 0,
  }));
};

export const createRole = async (roleName: unknown) => {
  if (typeof roleName !== "string" || !roleName.trim()) {
    throw new AppError(400, "Nombre requerido");
  }

  return Role.create({ nombre_rol: roleName.trim() });
};

export const updateRole = async (roleIdParam: string, roleName: unknown) => {
  const roleId = Number(roleIdParam);
  if (!Number.isInteger(roleId) || roleId <= 0) {
    throw new AppError(400, "ID de rol invalido");
  }

  if (typeof roleName !== "string" || !roleName.trim()) {
    throw new AppError(400, "Nombre requerido");
  }

  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new AppError(404, "Rol no encontrado");
  }

  role.nombre_rol = roleName.trim();
  await role.save();
  return role;
};

export const deleteRole = async (roleIdParam: string) => {
  const roleId = Number(roleIdParam);
  if (!Number.isInteger(roleId) || roleId <= 0) {
    throw new AppError(400, "ID de rol invalido");
  }

  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new AppError(404, "Rol no encontrado");
  }

  const assignedUsers = await countAssignedUsers(role.id_rol);
  if (assignedUsers > 0) {
    throw new AppError(
      409,
      `No se puede eliminar el rol "${role.nombre_rol}" porque tiene ${assignedUsers} usuario${assignedUsers === 1 ? "" : "s"} asignado${assignedUsers === 1 ? "" : "s"}.`
    );
  }

  try {
    await role.destroy();
  } catch (error) {
    if (error instanceof ForeignKeyConstraintError) {
      throw new AppError(
        409,
        "No se puede eliminar el rol porque todavia tiene registros asociados."
      );
    }
    throw error;
  }
};

import Rol from "../models/Role";
import { parsePositiveInt } from "./number";

export type CanonicalRoleName = "administrador" | "ciudadano" | "jac";

const ROLE_ALIASES: Record<CanonicalRoleName, readonly string[]> = {
  administrador: ["administrador", "admin"],
  ciudadano: ["ciudadano"],
  jac: ["jac"],
};

export const normalizeRoleName = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const toCanonicalRoleName = (value: unknown): CanonicalRoleName | null => {
  const normalized = normalizeRoleName(value);
  if (!normalized) return null;

  for (const [canonicalName, aliases] of Object.entries(ROLE_ALIASES) as Array<
    [CanonicalRoleName, readonly string[]]
  >) {
    if (aliases.includes(normalized)) {
      return canonicalName;
    }
  }

  return null;
};

export const isAdminRoleName = (value: unknown): boolean =>
  toCanonicalRoleName(value) === "administrador";

export const isJacRoleName = (value: unknown): boolean =>
  toCanonicalRoleName(value) === "jac";

export const resolveCanonicalRoleName = async (
  roleIdOrName: unknown,
  explicitRoleName?: unknown
): Promise<CanonicalRoleName | null> => {
  const directRoleName =
    toCanonicalRoleName(explicitRoleName) ?? toCanonicalRoleName(roleIdOrName);
  if (directRoleName) {
    return directRoleName;
  }

  const roleId = parsePositiveInt(roleIdOrName);
  if (!roleId) {
    return null;
  }

  const role = await Rol.findByPk(roleId, {
    attributes: ["nombre_rol"],
  });

  return toCanonicalRoleName(role?.nombre_rol ?? null);
};

export const resolveRoleIdByCanonicalName = async (
  canonicalRoleName: CanonicalRoleName
): Promise<number | null> => {
  const roles = (await Rol.findAll({
    attributes: ["id_rol", "nombre_rol"],
    raw: true,
  })) as Array<{ id_rol: number; nombre_rol: string }>;

  const matchedRole = roles.find(
    (role) => toCanonicalRoleName(role.nombre_rol) === canonicalRoleName
  );

  return matchedRole?.id_rol ?? null;
};

export const getRoleNameForToken = async (roleId: number): Promise<CanonicalRoleName | null> =>
  resolveCanonicalRoleName(roleId);

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRoleFindAll = vi.fn();
const mockRoleCreate = vi.fn();
const mockRoleFindByPk = vi.fn();
const mockUserCount = vi.fn();

vi.mock("../src/models/users/Role", () => ({
  default: {
    findAll: mockRoleFindAll,
    create: mockRoleCreate,
    findByPk: mockRoleFindByPk,
  },
}));

vi.mock("../src/models/users/User", () => ({
  default: {
    count: mockUserCount,
  },
}));

describe("roleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCount.mockResolvedValue(0);
  });

  it("no permite crear un rol duplicado con diferente capitalizacion", async () => {
    mockRoleFindAll.mockResolvedValue([{ id_rol: 1, nombre_rol: "Administrador" }]);

    const { createRole } = await import("../src/services/users/roleService");

    await expect(createRole("ADMINISTRADOR")).rejects.toMatchObject({
      statusCode: 409,
      message: "El rol ya existe",
    });

    expect(mockRoleCreate).not.toHaveBeenCalled();
  });

  it("formatea el nombre del rol con inicial mayuscula al crearlo", async () => {
    mockRoleFindAll.mockResolvedValue([]);
    mockRoleCreate.mockResolvedValue({ id_rol: 2, nombre_rol: "Moderador" });

    const { createRole } = await import("../src/services/users/roleService");

    await createRole("mODERADOR");

    expect(mockRoleCreate).toHaveBeenCalledWith({
      nombre_rol: "Moderador",
    });
  });

  it("no permite actualizar un rol al nombre de otro rol existente cambiando solo mayusculas", async () => {
    mockRoleFindByPk.mockResolvedValue({
      id_rol: 2,
      nombre_rol: "Editor",
      save: vi.fn(),
    });
    mockRoleFindAll.mockResolvedValue([
      { id_rol: 1, nombre_rol: "Administrador" },
      { id_rol: 2, nombre_rol: "Editor" },
    ]);

    const { updateRole } = await import("../src/services/users/roleService");

    await expect(updateRole("2", "ADMINISTRADOR")).rejects.toMatchObject({
      statusCode: 409,
      message: "El rol ya existe",
    });
  });

  it("permite actualizar el mismo rol cambiando solo capitalizacion y lo normaliza", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const role = {
      id_rol: 2,
      nombre_rol: "editor",
      save,
    };
    mockRoleFindByPk.mockResolvedValue(role);
    mockRoleFindAll.mockResolvedValue([{ id_rol: 2, nombre_rol: "editor" }]);

    const { updateRole } = await import("../src/services/users/roleService");

    const result = await updateRole("2", "EDITOR");

    expect(role.nombre_rol).toBe("Editor");
    expect(save).toHaveBeenCalled();
    expect(result).toBe(role);
  });
});

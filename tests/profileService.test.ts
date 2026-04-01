import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindByPk = vi.fn();
const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn();
const mockAlertUpdate = vi.fn();
const mockAlertReactionDestroy = vi.fn();
const mockCommentDestroy = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../src/models/users/User", () => ({
  default: {
    findByPk: mockUserFindByPk,
  },
}));

vi.mock("../src/models/alerts/Alert", () => ({
  default: {
    update: mockAlertUpdate,
  },
}));

vi.mock("../src/models/alerts/AlertReaction", () => ({
  default: {
    destroy: mockAlertReactionDestroy,
  },
}));

vi.mock("../src/models/alerts/Comment", () => ({
  default: {
    destroy: mockCommentDestroy,
  },
}));

vi.mock("../src/config/db", () => ({
  sequelize: {
    transaction: mockTransaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}));

describe("profileService security flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exige la contrasena actual para cambiar la contrasena autenticada", async () => {
    mockUserFindByPk.mockResolvedValue({
      id_usuario: 7,
      estado: true,
      contrasena: "stored-hash",
    });

    const { changeUserPassword } = await import(
      "../src/services/users/profileService"
    );

    await expect(
      changeUserPassword(
        { id: 7 },
        {
          nuevaContrasena: "NuevaClave123",
        }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "La contrasena actual es requerida",
    });

    expect(mockBcryptCompare).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it("elimina dependencias del usuario antes de borrar la cuenta", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    mockUserFindByPk.mockResolvedValue({
      id_usuario: 7,
      estado: true,
      destroy,
    });
    mockAlertUpdate.mockResolvedValue([2]);
    mockAlertReactionDestroy.mockResolvedValue(3);
    mockCommentDestroy.mockResolvedValue(4);
    mockTransaction.mockImplementation(async (callback) =>
      callback("mock-transaction")
    );

    const { deleteOwnAccount } = await import(
      "../src/services/users/profileService"
    );

    await deleteOwnAccount({ id: 7 });

    expect(mockAlertUpdate).toHaveBeenCalledWith(
      { id_usuario: null },
      expect.objectContaining({
        where: { id_usuario: 7 },
        transaction: "mock-transaction",
        paranoid: false,
      })
    );
    expect(mockAlertReactionDestroy).toHaveBeenCalledWith({
      where: { id_usuario: 7 },
      transaction: "mock-transaction",
    });
    expect(mockCommentDestroy).toHaveBeenCalledWith({
      where: { id_usuario: 7 },
      transaction: "mock-transaction",
      force: true,
    });
    expect(destroy).toHaveBeenCalledWith({
      transaction: "mock-transaction",
    });
  });
});

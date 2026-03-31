import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAlertFindAll = vi.fn();
const mockAlertFindByPk = vi.fn();
const mockAlertCreate = vi.fn();
const mockAlertReactionFindAll = vi.fn();
const mockEvidenceBulkCreate = vi.fn();
const mockEvidenceFindAll = vi.fn();
const mockEvidenceDestroy = vi.fn();
const mockHistorialEstadoCreate = vi.fn();
const mockTransaction = vi.fn();
const mockResolveCategory = vi.fn();
const mockGetAlertWorkflowStateIds = vi.fn();
const mockHasRestrictedAlertFieldChanges = vi.fn();
const mockIsValidComunaBarrioPair = vi.fn();
const mockUploadEvidenceBatch = vi.fn();
const mockValidateEvidenceImages = vi.fn();
const mockBuildAlertPayloads = vi.fn();

vi.mock("../src/models/alerts/Alert", () => ({
  default: {
    findAll: mockAlertFindAll,
    findByPk: mockAlertFindByPk,
    create: mockAlertCreate,
  },
}));

vi.mock("../src/models/alerts/AlertReaction", () => ({
  default: {
    findAll: mockAlertReactionFindAll,
  },
}));

vi.mock("../src/models/alerts/Evidence", () => ({
  default: {
    bulkCreate: mockEvidenceBulkCreate,
    findAll: mockEvidenceFindAll,
    destroy: mockEvidenceDestroy,
  },
}));

vi.mock("../src/models/alerts/HistorialEstado", () => ({
  default: {
    create: mockHistorialEstadoCreate,
  },
}));

vi.mock("../src/config/db", () => ({
  sequelize: {
    transaction: mockTransaction,
  },
}));

vi.mock("../src/utils/categoryUtils", () => ({
  resolveAlertCategoryCatalogRecord: mockResolveCategory,
}));

vi.mock("../src/utils/alertUtils", () => {
  return {
    getAlertWorkflowStateIds: mockGetAlertWorkflowStateIds,
    hasRestrictedAlertFieldChanges: mockHasRestrictedAlertFieldChanges,
    isValidComunaBarrioPair: mockIsValidComunaBarrioPair,
    parseOptionalPositiveInt: (value: unknown) => {
      if (value === undefined || value === null || value === "") return undefined;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) return null;
      return parsed;
    },
    parseBooleanFlag: (value: unknown) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      if (typeof value !== "string") return false;
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "si";
    },
    parseEvidenceIdsToDelete: (value: unknown) => {
      if (value === undefined || value === null || value === "") return [];
      if (Array.isArray(value)) {
        const parsed = value.map((item) => Number(item));
        return parsed.every((item) => Number.isInteger(item) && item > 0)
          ? Array.from(new Set(parsed))
          : null;
      }
      if (typeof value === "string") {
        const parts = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => Number(item));
        return parts.every((item) => Number.isInteger(item) && item > 0)
          ? Array.from(new Set(parts))
          : null;
      }
      return null;
    },
    getPriorityWeight: vi.fn(),
    getStatusWeight: vi.fn(),
    isRequestAdmin: vi.fn(),
  };
});

vi.mock("../src/services/alerts/alertEvidenceService", () => ({
  uploadEvidenceBatch: mockUploadEvidenceBatch,
  validateEvidenceImages: mockValidateEvidenceImages,
}));

vi.mock("../src/services/alerts/alertPayloadService", () => ({
  buildAlertPayloads: mockBuildAlertPayloads,
}));

describe("alert CRUD coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista alertas con payload transformado", async () => {
    mockAlertFindAll.mockResolvedValue([{ id_alerta: 1 }, { id_alerta: 2 }]);
    mockBuildAlertPayloads.mockResolvedValue([
      { id_alerta: 1, titulo: "A" },
      { id_alerta: 2, titulo: "B" },
    ]);

    const { listAlerta } = await import("../src/controllers/alerts/alertController");
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    await listAlerta({} as any, res);

    expect(mockAlertFindAll).toHaveBeenCalled();
    expect(mockBuildAlertPayloads).toHaveBeenCalledWith([
      { id_alerta: 1 },
      { id_alerta: 2 },
    ]);
    expect(res.json).toHaveBeenCalledWith([
      { id_alerta: 1, titulo: "A" },
      { id_alerta: 2, titulo: "B" },
    ]);
  });

  it("obtiene detalle de una alerta por id", async () => {
    mockAlertFindByPk.mockResolvedValue({ id_alerta: 7 });
    mockBuildAlertPayloads.mockResolvedValue([{ id_alerta: 7, titulo: "Detalle" }]);

    const { getAlertaById } = await import("../src/controllers/alerts/alertController");
    const req = { params: { id: "7" } } as any;
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    await getAlertaById(req, res);

    expect(mockAlertFindByPk).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ id_alerta: 7, titulo: "Detalle" });
  });

  it("crea una alerta y registra evidencias e historial", async () => {
    mockResolveCategory.mockResolvedValue({
      id_categoria: 3,
      label: "Seguridad y Convivencia",
    });
    mockIsValidComunaBarrioPair.mockResolvedValue(true);
    mockValidateEvidenceImages.mockReturnValue(null);
    mockGetAlertWorkflowStateIds.mockResolvedValue({
      pendiente: 1,
      en_progreso: 2,
      resuelta: 3,
      falsa_alerta: 4,
    });
    mockUploadEvidenceBatch.mockResolvedValue([
      { secureUrl: "https://img.test/1", mimeType: "image/png" },
    ]);
    mockTransaction.mockImplementation(async (callback) => callback("trx"));
    mockAlertCreate.mockResolvedValue({ id_alerta: 99 });

    const { createAlertRecord } = await import("../src/services/alerts/alertMutationService");

    const result = await createAlertRecord({
      body: {
        titulo: "Alerta",
        descripcion: "Descripcion",
        categoria: "Seguridad",
        ubicacion: "Calle 1",
        id_comuna: 2,
        id_barrio: 5,
      },
      userId: 12,
      evidenceFiles: [{} as Express.Multer.File],
    });

    expect(mockAlertCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: "Alerta",
        descripcion: "Descripcion",
        id_categoria: 3,
        id_usuario: 12,
        id_estado: 1,
      }),
      { transaction: "trx" }
    );
    expect(mockEvidenceBulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id_alerta: 99,
          url_evidencia: "https://img.test/1",
          created_by_id: 12,
        }),
      ],
      { returning: true, transaction: "trx" }
    );
    expect(mockHistorialEstadoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id_alerta: 99,
        id_estado: 1,
        created_by_id: 12,
      }),
      { transaction: "trx" }
    );
    expect(result).toEqual({ id_alerta: 99 });
  });

  it("actualiza una alerta pendiente cuando el propietario tiene permiso", async () => {
    mockGetAlertWorkflowStateIds.mockResolvedValue({
      pendiente: 1,
      en_progreso: 2,
      resuelta: 3,
      falsa_alerta: 4,
    });
    mockHasRestrictedAlertFieldChanges.mockReturnValue(false);

    const save = vi.fn().mockResolvedValue(undefined);
    const alert = {
      id_alerta: 10,
      id_usuario: 15,
      id_estado: 1,
      titulo: "Viejo",
      descripcion: "Vieja",
      save,
    } as any;

    const { updateAlertRecord } = await import("../src/services/alerts/alertMutationService");

    const result = await updateAlertRecord({
      alert,
      body: {
        titulo: "Nuevo titulo",
        descripcion: "Nueva descripcion",
      },
      userId: 15,
      isAdmin: false,
      evidenceFiles: [],
    });

    expect(alert.titulo).toBe("Nuevo titulo");
    expect(alert.descripcion).toBe("Nueva descripcion");
    expect(save).toHaveBeenCalled();
    expect(result).toBe(alert);
  });

  it("rechaza editar alertas de otros usuarios cuando no es admin", async () => {
    mockGetAlertWorkflowStateIds.mockResolvedValue({
      pendiente: 1,
      en_progreso: 2,
      resuelta: 3,
      falsa_alerta: 4,
    });

    const { updateAlertRecord } = await import("../src/services/alerts/alertMutationService");

    await expect(
      updateAlertRecord({
        alert: {
          id_alerta: 10,
          id_usuario: 30,
          id_estado: 1,
          save: vi.fn(),
        } as any,
        body: { titulo: "Intento" },
        userId: 15,
        isAdmin: false,
        evidenceFiles: [],
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "No puedes editar alertas de otros usuarios",
    });
  });

  it("elimina una alerta pendiente cuando el propietario tiene permiso", async () => {
    mockGetAlertWorkflowStateIds.mockResolvedValue({
      pendiente: 1,
      en_progreso: 2,
      resuelta: 3,
      falsa_alerta: 4,
    });

    const destroy = vi.fn().mockResolvedValue(undefined);
    const alert = {
      id_alerta: 22,
      id_usuario: 15,
      id_estado: 1,
      destroy,
    } as any;

    const { deleteAlertRecord } = await import("../src/services/alerts/alertMutationService");

    await deleteAlertRecord({
      alert,
      userId: 15,
      isAdmin: false,
    });

    expect(destroy).toHaveBeenCalled();
  });

  it("rechaza eliminar alertas de otros usuarios cuando no es admin", async () => {
    mockGetAlertWorkflowStateIds.mockResolvedValue({
      pendiente: 1,
      en_progreso: 2,
      resuelta: 3,
      falsa_alerta: 4,
    });

    const { deleteAlertRecord } = await import("../src/services/alerts/alertMutationService");

    await expect(
      deleteAlertRecord({
        alert: {
          id_alerta: 22,
          id_usuario: 77,
          id_estado: 1,
          destroy: vi.fn(),
        } as any,
        userId: 15,
        isAdmin: false,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "No puedes eliminar alertas de otros usuarios",
    });
  });
});

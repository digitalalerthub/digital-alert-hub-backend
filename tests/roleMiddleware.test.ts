import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveCanonicalRoleName = vi.fn();

vi.mock("../src/utils/roleUtils", async () => {
  const actual = await vi.importActual("../src/utils/roleUtils");
  return {
    ...actual,
    resolveCanonicalRoleName: mockResolveCanonicalRoleName,
  };
});

describe("isAdmin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite el acceso a un administrador", async () => {
    mockResolveCanonicalRoleName.mockResolvedValue("administrador");

    const { isAdmin } = await import("../src/middleware/roleMiddleware");
    const next = vi.fn();

    await isAdmin(
      {
        user: {
          id: 1,
          rol: 1,
          role_name: "administrador",
        },
      } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it("rechaza a un usuario sin rol de administrador", async () => {
    mockResolveCanonicalRoleName.mockResolvedValue("ciudadano");

    const { isAdmin } = await import("../src/middleware/roleMiddleware");
    const next = vi.fn();

    await isAdmin(
      {
        user: {
          id: 2,
          rol: 2,
          role_name: "ciudadano",
        },
      } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: "No tienes permisos de administrador",
      })
    );
  });
});

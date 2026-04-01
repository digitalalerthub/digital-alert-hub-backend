import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindByPk = vi.fn();
const mockExtractRequestToken = vi.fn();
const mockAttachRequestUserFromToken = vi.fn();
const mockGetRoleNameForToken = vi.fn();

vi.mock("../src/models/users/User", () => ({
  default: {
    findByPk: mockFindByPk,
  },
}));

vi.mock("../src/services/auth/authSessionService", () => ({
  extractRequestToken: mockExtractRequestToken,
  attachRequestUserFromToken: mockAttachRequestUserFromToken,
}));

vi.mock("../src/utils/roleUtils", () => ({
  getRoleNameForToken: mockGetRoleNameForToken,
}));

describe("verifyToken middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hidrata el rol vigente del usuario desde base de datos", async () => {
    mockExtractRequestToken.mockReturnValue("jwt-test");
    mockAttachRequestUserFromToken.mockImplementation((req) => {
      req.user = {
        id: 5,
        email: "stale@example.com",
        rol: 1,
        role_name: "administrador",
        session_version: 3,
      };
      return req.user;
    });
    mockFindByPk.mockResolvedValue({
      id_usuario: 5,
      email: "current@example.com",
      estado: true,
      id_rol: 2,
      session_version: 3,
    });
    mockGetRoleNameForToken.mockResolvedValue("ciudadano");

    const { verifyToken } = await import("../src/middleware/authMiddleware");
    const req = {} as any;
    const next = vi.fn();

    await verifyToken(req, {} as any, next);

    expect(mockFindByPk).toHaveBeenCalledWith(5, {
      attributes: ["id_usuario", "estado", "id_rol", "email", "session_version"],
    });
    expect(mockGetRoleNameForToken).toHaveBeenCalledWith(2);
    expect(req.user).toEqual({
      id: 5,
      email: "current@example.com",
      rol: 2,
      role_name: "ciudadano",
      session_version: 3,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("rechaza tokens cuya sesion ya fue revocada", async () => {
    mockExtractRequestToken.mockReturnValue("jwt-test");
    mockAttachRequestUserFromToken.mockImplementation((req) => {
      req.user = {
        id: 5,
        email: "current@example.com",
        rol: 2,
        role_name: "ciudadano",
        session_version: 2,
      };
      return req.user;
    });
    mockFindByPk.mockResolvedValue({
      id_usuario: 5,
      email: "current@example.com",
      estado: true,
      id_rol: 2,
      session_version: 3,
    });

    const { verifyToken } = await import("../src/middleware/authMiddleware");
    const req = {} as any;
    const next = vi.fn();

    await verifyToken(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Sesion revocada o expirada",
      })
    );
    expect(mockGetRoleNameForToken).not.toHaveBeenCalled();
  });
});

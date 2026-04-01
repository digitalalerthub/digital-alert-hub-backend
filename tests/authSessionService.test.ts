import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindByPk = vi.fn();
const mockJwtVerify = vi.fn();

vi.mock("../src/models/users/User", () => ({
  default: {
    findByPk: mockFindByPk,
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

describe("revokeRequestSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("incrementa session_version al cerrar sesion con un token vigente", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockJwtVerify.mockReturnValue({
      id: 8,
      email: "ana@test.com",
      rol: 2,
      role_name: "ciudadano",
      session_version: 4,
    });
    mockFindByPk.mockResolvedValue({
      id_usuario: 8,
      session_version: 4,
      update,
    });

    const { revokeRequestSession } = await import(
      "../src/services/auth/authSessionService"
    );

    await revokeRequestSession({
      headers: {
        cookie: "digital_alert_hub_session=jwt-test",
      },
    } as any);

    expect(mockFindByPk).toHaveBeenCalledWith(8, {
      attributes: ["id_usuario", "session_version"],
    });
    expect(update).toHaveBeenCalledWith({
      session_version: 5,
    });
  });

  it("no revoca dos veces si el token ya tenia una version vieja", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockJwtVerify.mockReturnValue({
      id: 8,
      email: "ana@test.com",
      rol: 2,
      role_name: "ciudadano",
      session_version: 4,
    });
    mockFindByPk.mockResolvedValue({
      id_usuario: 8,
      session_version: 5,
      update,
    });

    const { revokeRequestSession } = await import(
      "../src/services/auth/authSessionService"
    );

    await revokeRequestSession({
      headers: {
        cookie: "digital_alert_hub_session=jwt-test",
      },
    } as any);

    expect(update).not.toHaveBeenCalled();
  });
});

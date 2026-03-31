import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockFindByPk = vi.fn();
const mockResolveRoleIdByCanonicalName = vi.fn();
const mockGetRoleNameForToken = vi.fn();
const mockValidateRecaptchaOrThrow = vi.fn();
const mockBuildVerificationLink = vi.fn();
const mockBuildPasswordActionLink = vi.fn();
const mockSendAccountCreatedEmail = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockHash = vi.fn();
const mockJwtVerify = vi.fn();

vi.mock("../src/models/users/User", () => ({
  default: {
    findOne: mockFindOne,
    create: mockCreate,
    findByPk: mockFindByPk,
  },
}));

vi.mock("../src/utils/roleUtils", () => ({
  getRoleNameForToken: mockGetRoleNameForToken,
  resolveRoleIdByCanonicalName: mockResolveRoleIdByCanonicalName,
}));

vi.mock("../src/services/auth/recaptchaService", () => ({
  validateRecaptchaOrThrow: mockValidateRecaptchaOrThrow,
}));

vi.mock("../src/services/auth/authLinkService", () => ({
  buildVerificationLink: mockBuildVerificationLink,
  buildPasswordActionLink: mockBuildPasswordActionLink,
  resolveFrontendBaseUrl: vi.fn(),
}));

vi.mock("../src/services/auth/authMailService", () => ({
  sendAccountCreatedEmail: mockSendAccountCreatedEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: mockHash,
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

describe("authService security flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignora id_rol enviado en el registro publico y usa el rol ciudadano", async () => {
    mockFindOne.mockResolvedValue(null);
    mockResolveRoleIdByCanonicalName.mockResolvedValue(2);
    mockHash.mockResolvedValue("hashed-password");
    mockBuildVerificationLink.mockReturnValue("http://backend.test/verify");
    mockSendAccountCreatedEmail.mockResolvedValue({
      provider: "smtp",
      id: "mail-1",
    });
    mockGetRoleNameForToken.mockResolvedValue("ciudadano");
    mockCreate.mockResolvedValue({
      id_usuario: 15,
      nombre: "Ana",
      apellido: "Perez",
      email: "ana@test.com",
      id_rol: 2,
    });

    const { registerUser } = await import("../src/services/auth/authService");
    const req = { ip: "127.0.0.1" } as any;

    const result = await registerUser(req, {
      nombre: "Ana",
      apellido: "Perez",
      email: "ana@test.com",
      contrasena: "abc12345",
      telefono: "3001234567",
      id_rol: 99,
      captchaToken: "captcha-register",
    });

    expect(mockValidateRecaptchaOrThrow).toHaveBeenCalledWith(
      req,
      "captcha-register",
      "register"
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@test.com",
        id_rol: 2,
      })
    );
    expect(result.body.user.role_name).toBe("ciudadano");
  });

  it("exige reCAPTCHA al solicitar recuperacion de contrasena", async () => {
    mockFindOne.mockResolvedValue({
      email: "ana@test.com",
    });
    mockBuildPasswordActionLink.mockReturnValue("http://frontend.test/reset");
    mockSendPasswordResetEmail.mockResolvedValue({
      provider: "smtp",
      id: "mail-2",
    });

    const { sendPasswordReset } = await import("../src/services/auth/authService");
    const req = { ip: "127.0.0.1" } as any;

    await sendPasswordReset(req, "ana@test.com", "captcha-forgot");

    expect(mockValidateRecaptchaOrThrow).toHaveBeenCalledWith(
      req,
      "captcha-forgot",
      "forgot_password"
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      "ana@test.com",
      "http://frontend.test/reset"
    );
  });

  it("exige reCAPTCHA al establecer contrasena desde el flujo creado por admin", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    mockJwtVerify.mockReturnValue({
      id: 15,
      email: "ana@test.com",
      type: "set_password",
    });
    mockFindByPk.mockResolvedValue({
      update,
    });
    mockHash.mockResolvedValue("hashed-password");

    const { resetUserPassword } = await import("../src/services/auth/authService");
    const req = { ip: "127.0.0.1" } as any;

    const result = await resetUserPassword(req, "token-123", {
      nuevaContrasena: "abc12345",
      captchaToken: "captcha-set-password",
    });

    expect(mockValidateRecaptchaOrThrow).toHaveBeenCalledWith(
      req,
      "captcha-set-password",
      "set_password"
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        contrasena: "hashed-password",
        email_verificado: true,
        estado: true,
      })
    );
    expect(result.message).toContain("Cuenta activada");
  });
});

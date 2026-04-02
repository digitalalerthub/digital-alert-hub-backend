import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { AppError } from "../src/utils/appError";

describe("errorHandler", () => {
  it("incluye detalles opcionales cuando el error es AppError", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const res = { status, json } as any;

    errorHandler(
      new AppError(401, "Cuenta bloqueada temporalmente.", {
        attempts_remaining: 0,
        retry_after_seconds: 300,
      }),
      {} as any,
      res,
      vi.fn()
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      message: "Cuenta bloqueada temporalmente.",
      attempts_remaining: 0,
      retry_after_seconds: 300,
    });
  });
});

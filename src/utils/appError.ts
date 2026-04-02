export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

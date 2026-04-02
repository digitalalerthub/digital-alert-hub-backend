import { NextFunction, Request, Response } from "express";
import {
  isResponseTimingEnabled,
  resolveSlowRequestThresholdMs,
} from "../config/securityConfig";

const formatDurationMs = (durationMs: number): string => durationMs.toFixed(1);

export const applyRequestObservability = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startedAt = process.hrtime.bigint();
  const originalEnd = res.end.bind(res) as Response["end"];

  res.end = ((chunk?: any, encoding?: any, callback?: any) => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const durationLabel = formatDurationMs(durationMs);

    if (!res.headersSent && isResponseTimingEnabled()) {
      res.setHeader("Server-Timing", `app;dur=${durationLabel}`);
      res.setHeader("X-Response-Time", `${durationLabel}ms`);
    }

    if (durationMs >= resolveSlowRequestThresholdMs()) {
      console.warn(
        `[slow-request] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationLabel}ms`
      );
    }

    return originalEnd(chunk, encoding, callback);
  }) as Response["end"];

  next();
};

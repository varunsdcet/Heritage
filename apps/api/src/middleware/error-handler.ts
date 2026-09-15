import type { NextFunction, Request, Response } from "express";
import { ErrorEnvelope } from "@myheritage/contracts";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const e = err as { status?: number; code?: string; message?: string; issues?: unknown };
  const status = e.status ?? 500;
  const body = ErrorEnvelope.parse({
    error: {
      code: e.code ?? "INTERNAL",
      message: e.message ?? "Unexpected error",
      details: e.issues,
      correlationId: (req as Request & { correlationId?: string }).correlationId ?? "unknown",
    },
  });
  res.status(status).json(body);
}

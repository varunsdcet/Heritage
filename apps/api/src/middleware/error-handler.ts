import type { NextFunction, Request, Response } from "express";
import { ErrorEnvelope } from "@myheritage/contracts";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const e = err as {
    status?: number;
    code?: string;
    message?: string;
    issues?: Array<{ path?: Array<string | number>; message?: string }>;
    name?: string;
  };
  const isValidationError = e.name === "ZodError";
  const status = e.status ?? (isValidationError ? 400 : 500);
  const firstIssue = isValidationError ? e.issues?.[0] : undefined;
  const issueHint = firstIssue
    ? `${firstIssue.path?.length ? `${firstIssue.path.join(".")}: ` : ""}${firstIssue.message ?? "invalid"}`
    : null;
  const body = ErrorEnvelope.parse({
    error: {
      code: e.code ?? (isValidationError ? "VALIDATION_ERROR" : "INTERNAL"),
      message: isValidationError
        ? issueHint
          ? `Invalid request (${issueHint})`
          : "Invalid request"
        : (e.message ?? "Unexpected error"),
      details: e.issues,
      correlationId: (req as Request & { correlationId?: string }).correlationId ?? "unknown",
    },
  });
  res.status(status).json(body);
}

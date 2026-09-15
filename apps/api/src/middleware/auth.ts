import type { NextFunction, Request, Response } from "express";
import { verifySession, hasRole } from "@myheritage/auth";
import type { RoleName, SessionClaims } from "@myheritage/contracts";

export type AuthedRequest = Request & {
  user: SessionClaims;
  correlationId: string;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw Object.assign(new Error("Missing bearer token"), { code: "UNAUTHORIZED", status: 401 });
    }
    const token = header.slice("Bearer ".length);
    const user = await verifySession(token);
    (req as AuthedRequest).user = user;
    next();
  } catch (err) {
    next(Object.assign(err instanceof Error ? err : new Error("Unauthorized"), {
      code: "UNAUTHORIZED",
      status: 401,
    }));
  }
}

export function requireRoles(...roles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user;
    if (!user || !hasRole(user.roles, roles)) {
      next(Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 }));
      return;
    }
    next();
  };
}

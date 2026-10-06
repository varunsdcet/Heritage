import type { NextFunction, Request, Response } from "express";
import { verifySession, hasRole } from "@myheritage/auth";
import type { RoleName, SessionClaims } from "@myheritage/contracts";
import { prisma } from "@myheritage/db";

export type AuthedRequest = Request & {
  user: SessionClaims;
  correlationId: string;
};

const REVOCATION_TTL_MS = 15_000;
const revocations = new Map<string, { revoked: boolean; at: number }>();

/**
 * Every token is minted at login alongside a session row. Logout, disabling an account, password resets,
 * role changes and the concurrent-session limit delete that row; an administrator revoking a session
 * expires it. Either way the token stops working.
 */
async function sessionRevoked(sessionId: string | undefined) {
  if (!sessionId) return true;
  const hit = revocations.get(sessionId);
  if (hit && Date.now() - hit.at < REVOCATION_TTL_MS) return hit.revoked;
  const row = await prisma.session.findUnique({ where: { id: sessionId }, select: { expiresAt: true } });
  const revoked = !row || row.expiresAt.getTime() <= Date.now();
  if (revocations.size > 10_000) revocations.clear();
  revocations.set(sessionId, { revoked, at: Date.now() });
  return revoked;
}

export function forgetSessionRevocation(sessionId: string) {
  revocations.delete(sessionId);
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw Object.assign(new Error("Missing bearer token"), { code: "UNAUTHORIZED", status: 401 });
    }
    const token = header.slice("Bearer ".length);
    const user = await verifySession(token);
    if (await sessionRevoked(user.sessionId)) throw new Error("This session has been signed out. Please sign in again.");
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

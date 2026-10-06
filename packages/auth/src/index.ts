import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { RoleName, SessionClaims } from "@myheritage/contracts";
import { SessionClaims as SessionClaimsSchema } from "@myheritage/contracts";
import { prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";
import { randomUUID } from "node:crypto";

const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(process.env.JWT_SECRET ?? "dev-jwt-secret-change-me");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Access-token lifetime kept long for campus retest / day-to-day portal use. */
const SESSION_TTL_LONG = "30d";
const SESSION_TTL_LONG_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL_SHORT = "12h";
const SESSION_TTL_SHORT_MS = 12 * 60 * 60 * 1000;

export async function signSession(claims: SessionClaims, ttl: string = SESSION_TTL_LONG) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionClaims> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      // Tolerate small host/container NTP skew without accepting truly expired sessions.
      clockTolerance: "2m",
    });
    return SessionClaimsSchema.parse(payload);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ERR_JWT_EXPIRED" || /"exp" claim timestamp check failed/i.test(String(err))) {
      throw Object.assign(new Error("Session expired. Please sign in again."), {
        code: "UNAUTHORIZED",
        status: 401,
      });
    }
    throw err;
  }
}

export function hasRole(roles: RoleName[], needed: RoleName | RoleName[]) {
  const list = Array.isArray(needed) ? needed : [needed];
  return list.some((r) => roles.includes(r));
}

/** "User Login" names configured by super admins live in the super:user-meta store (accountId → { login }). */
async function findAccountIdByUserLogin(login: string) {
  const rows = await prisma.sisScreenState.findMany({ where: { path: "super:user-meta" } });
  const needle = login.toLowerCase();
  for (const row of rows) {
    try {
      const meta = JSON.parse(row.payloadJson) as Record<string, { login?: string }>;
      const hit = Object.entries(meta).find(([, m]) => m.login?.toLowerCase() === needle);
      if (hit) return hit[0];
    } catch {
      continue;
    }
  }
  return null;
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  remember?: boolean;
}) {
  const identifier = input.email.trim();
  const looksLikeEmail = identifier.includes("@");
  let account = looksLikeEmail
    ? await prisma.account.findFirst({
        where: { email: identifier.toLowerCase() },
        include: { person: true },
      })
    : null;

  if (!account && !looksLikeEmail) {
    const student = await prisma.student.findFirst({
      where: { studentNumber: { equals: identifier, mode: "insensitive" } },
      include: { person: { include: { accounts: true } } },
    });
    const linked = student?.person.accounts.find((a) => a.status === "active") ?? student?.person.accounts[0];
    if (linked) {
      account = await prisma.account.findFirst({
        where: { id: linked.id },
        include: { person: true },
      });
    }
  }

  if (!account && !looksLikeEmail) {
    const accountId = await findAccountIdByUserLogin(identifier);
    if (accountId) {
      account = await prisma.account.findFirst({
        where: { id: accountId },
        include: { person: true },
      });
    }
  }

  if (!account || (account.status !== "active" && account.status !== "paused")) {
    throw Object.assign(new Error("Invalid credentials"), { code: "UNAUTHORIZED", status: 401 });
  }
  const ok = await verifyPassword(input.password, account.passwordHash);
  if (!ok) {
    throw Object.assign(new Error("Invalid credentials"), { code: "UNAUTHORIZED", status: 401 });
  }

  const remember = input.remember !== false;
  const ttl = remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT;
  const ttlMs = remember ? SESSION_TTL_LONG_MS : SESSION_TTL_SHORT_MS;

  const policy = await prisma.securityPolicy.findUnique({ where: { institutionId: account.institutionId } });
  const max = policy?.maxConcurrentSessions ?? 3;
  const active = await prisma.session.count({
    where: { accountId: account.id, expiresAt: { gt: new Date() } },
  });
  if (active >= max) {
    const oldest = await prisma.session.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: "asc" },
    });
    if (oldest) await prisma.session.delete({ where: { id: oldest.id } });
  }

  const roles = JSON.parse(account.rolesJson) as RoleName[];
  const correlationId = randomUUID();
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        institutionId: account.institutionId,
        accountId: account.id,
        deviceFingerprint: input.deviceFingerprint,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        geoLocation: "Surrey, BC",
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: account.institutionId,
      actorId: account.id,
      eventName: "Account.login",
      purpose: "authentication",
      before: null,
      after: { sessionId: created.id, ip: input.ipAddress, remember, accountStatus: account.status },
      source: "auth.login",
      correlationId,
    });
    return created;
  });

  const accountStatus = account.status === "paused" ? ("paused" as const) : ("active" as const);
  const claims: SessionClaims = {
    sub: account.id,
    accountId: account.id,
    personId: account.personId,
    institutionId: account.institutionId,
    roles,
    sessionId: session.id,
    accountStatus,
  };

  const accessToken = await signSession(claims, ttl);
  return {
    accessToken,
    accountId: account.id,
    personId: account.personId,
    institutionId: account.institutionId,
    roles,
    givenName: account.person.givenName,
    familyName: account.person.familyName,
    requiresMfa: account.mfaEnabled,
    accountStatus,
    pauseGate: accountStatus === "paused",
  };
}

export async function changePassword(input: {
  accountId: string;
  institutionId: string;
  currentPassword: string;
  newPassword: string;
  keepSessionId?: string;
}) {
  const account = await prisma.account.findFirst({
    where: { id: input.accountId, institutionId: input.institutionId },
  });
  if (!account || account.status !== "active") {
    throw Object.assign(new Error("Account not found"), { code: "NOT_FOUND", status: 404 });
  }
  const ok = await verifyPassword(input.currentPassword, account.passwordHash);
  if (!ok) {
    throw Object.assign(new Error("Current password is incorrect"), { code: "VALIDATION_ERROR", status: 400 });
  }
  if (input.currentPassword === input.newPassword) {
    throw Object.assign(new Error("New password must be different"), { code: "VALIDATION_ERROR", status: 400 });
  }
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.account.update({ where: { id: account.id }, data: { passwordHash } }),
    prisma.session.deleteMany({
      where: {
        accountId: account.id,
        ...(input.keepSessionId ? { id: { not: input.keepSessionId } } : {}),
      },
    }),
  ]);
  return { ok: true as const };
}

export * from "./approvals.js";

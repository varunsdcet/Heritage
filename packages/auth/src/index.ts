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

export async function signSession(claims: SessionClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey());
  return SessionClaimsSchema.parse(payload);
}

export function hasRole(roles: RoleName[], needed: RoleName | RoleName[]) {
  const list = Array.isArray(needed) ? needed : [needed];
  return list.some((r) => roles.includes(r));
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
}) {
  const account = await prisma.account.findFirst({
    where: { email: input.email.toLowerCase() },
    include: { person: true },
  });
  if (!account || account.status !== "active") {
    throw Object.assign(new Error("Invalid credentials"), { code: "UNAUTHORIZED", status: 401 });
  }
  const ok = await verifyPassword(input.password, account.passwordHash);
  if (!ok) {
    throw Object.assign(new Error("Invalid credentials"), { code: "UNAUTHORIZED", status: 401 });
  }

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
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: account.institutionId,
      actorId: account.id,
      eventName: "Account.login",
      purpose: "authentication",
      before: null,
      after: { sessionId: created.id, ip: input.ipAddress },
      source: "auth.login",
      correlationId,
    });
    return created;
  });

  const claims: SessionClaims = {
    sub: account.id,
    accountId: account.id,
    personId: account.personId,
    institutionId: account.institutionId,
    roles,
    sessionId: session.id,
  };

  const accessToken = await signSession(claims);
  return {
    accessToken,
    accountId: account.id,
    personId: account.personId,
    institutionId: account.institutionId,
    roles,
    givenName: account.person.givenName,
    familyName: account.person.familyName,
    requiresMfa: account.mfaEnabled,
  };
}

export * from "./approvals.js";

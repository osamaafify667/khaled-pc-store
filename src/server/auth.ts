import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Role } from "@prisma/client";
import { prisma } from "./db";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export const SESSION_COOKIE = "kps_session";
export const CART_COOKIE = "kps_cart";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
};

export class AuthError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code === "UNAUTHENTICATED" ? "يجب تسجيل الدخول" : "غير مصرح");
    this.code = code;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algorithm, n, r, p, saltB64, hashB64] = stored.split("$");
    if (algorithm !== "scrypt" || !saltB64 || !hashB64) return false;
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const days = Number(process.env.AUTH_SESSION_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + Math.max(days, 1) * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function deleteAllUserSessions(userId: string, exceptToken?: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(exceptToken ? { id: { not: hashToken(exceptToken) } } : {}),
    },
  });
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } });
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    role: session.user.role,
  };
});

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** نسخة تعمل داخل الخدمات والاختبارات دون الاعتماد على Next request context. */
export async function requireAdminById(userId: string | null | undefined): Promise<SessionUser> {
  if (!userId) throw new AuthError("UNAUTHENTICATED");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AuthError("UNAUTHENTICATED");
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN");
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
}

export async function requireUserById(userId: string | null | undefined): Promise<SessionUser> {
  if (!userId) throw new AuthError("UNAUTHENTICATED");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AuthError("UNAUTHENTICATED");
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
}

export async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    return { ip, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

// ----------------------- Rate limiting -----------------------

export async function loginAttemptKey(email: string, ip: string | null): Promise<string> {
  return createHash("sha256").update(`${email.toLowerCase()}:${ip ?? "unknown"}`).digest("hex");
}

export async function assertLoginAllowed(key: string): Promise<void> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { key } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    const minutes = Math.max(1, Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 60000));
    throw new Error(`تم إيقاف المحاولات مؤقتًا لأسباب أمنية. حاول بعد ${minutes} دقيقة.`);
  }
}

export async function recordLoginFailure(key: string): Promise<void> {
  const maxAttempts = Math.max(Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? 5), 1);
  const lockMinutes = Math.max(Number(process.env.AUTH_LOCK_MINUTES ?? 15), 1);
  const existing = await prisma.loginAttempt.findUnique({ where: { key } });
  const count = (existing?.count ?? 0) + 1;
  const shouldLock = count >= maxAttempts;
  await prisma.loginAttempt.upsert({
    where: { key },
    create: {
      key,
      count,
      lastAt: new Date(),
      lockedUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60_000) : null,
    },
    update: {
      count,
      lastAt: new Date(),
      lockedUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60_000) : null,
    },
  });
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}

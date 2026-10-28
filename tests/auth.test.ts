import { beforeEach, describe, expect, it } from "vitest";
import {
  assertLoginAllowed,
  AuthError,
  cleanupExpiredSessions,
  clearLoginAttempts,
  createSession,
  deleteAllUserSessions,
  deleteSession,
  hashPassword,
  hashToken,
  loginAttemptKey,
  recordLoginFailure,
  requireAdminById,
  requireUserById,
  verifyPassword,
} from "@/server/auth";
import { createAdmin, createCustomer, prisma, resetDatabase } from "./helpers/db";

beforeEach(async () => {
  await resetDatabase();
});

describe("تخزين كلمات المرور", () => {
  it("يستخدم scrypt مع ملح عشوائي ولا يخزّن كلمة المرور", async () => {
    const password = "StrongPass123!";
    const hash = await hashPassword(password);

    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(hash).not.toContain(password);
    expect(hash.split("$")).toHaveLength(6);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("يرفض كلمة مرور خاطئة أو تجزئة تالفة", async () => {
    const hash = await hashPassword("StrongPass123!");
    expect(await verifyPassword("WrongPass123!", hash)).toBe(false);
    expect(await verifyPassword("StrongPass123!", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("StrongPass123!", "scrypt$1$2$3$$")).toBe(false);
  });

  it("ينتج تجزئات مختلفة لنفس كلمة المرور بسبب الملح", async () => {
    const first = await hashPassword("SamePassword123!");
    const second = await hashPassword("SamePassword123!");
    expect(first).not.toBe(second);
    expect(await verifyPassword("SamePassword123!", second)).toBe(true);
  });
});

describe("الجلسات", () => {
  it("يخزّن تجزئة التوكن فقط ويستطيع حذف الجلسة", async () => {
    const user = await createCustomer();
    const { token, expiresAt } = await createSession(user.id, {
      ip: "127.0.0.1",
      userAgent: "Vitest",
    });

    expect(token).toHaveLength(43);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const stored = await prisma.session.findUniqueOrThrow({ where: { id: hashToken(token) } });
    expect(stored.id).toBe(hashToken(token));
    expect(stored.userId).toBe(user.id);
    expect(stored.ip).toBe("127.0.0.1");
    expect(await prisma.session.findFirst({ where: { id: token } })).toBeNull();

    await deleteSession(token);
    expect(await prisma.session.findUnique({ where: { id: hashToken(token) } })).toBeNull();
  });

  it("يحذف كل جلسات المستخدم مع استثناء الجلسة الحالية", async () => {
    const user = await createCustomer();
    const first = await createSession(user.id);
    const second = await createSession(user.id);

    await deleteAllUserSessions(user.id, first.token);

    expect(await prisma.session.findUnique({ where: { id: hashToken(first.token) } })).not.toBeNull();
    expect(await prisma.session.findUnique({ where: { id: hashToken(second.token) } })).toBeNull();
  });

  it("ينظّف الجلسات المنتهية فقط", async () => {
    const user = await createCustomer();
    const active = await createSession(user.id);

    await prisma.session.create({
      data: {
        id: hashToken("expired-token"),
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    expect(await cleanupExpiredSessions()).toBe(1);
    expect(await prisma.session.findUnique({ where: { id: hashToken(active.token) } })).not.toBeNull();
  });
});

describe("صلاحيات المدير والعميل", () => {
  it("يعيد بيانات المدير النشط", async () => {
    const admin = await createAdmin();
    const result = await requireAdminById(admin.id);
    expect(result.id).toBe(admin.id);
    expect(result.role).toBe("ADMIN");
  });

  it("يمنع العميل العادي من صلاحيات المدير", async () => {
    const customer = await createCustomer();

    const error = await requireAdminById(customer.id).catch((e) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("يرفض المستخدم غير الموجود أو المعطّل أو المجهول", async () => {
    const admin = await createAdmin();
    await prisma.user.update({ where: { id: admin.id }, data: { isActive: false } });

    await expect(requireAdminById(admin.id)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(requireAdminById(null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(requireAdminById("missing-user")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("يسمح لأي مستخدم نشط بالوصول لبياناته", async () => {
    const customer = await createCustomer();
    const result = await requireUserById(customer.id);
    expect(result.role).toBe("CUSTOMER");

    await prisma.user.update({ where: { id: customer.id }, data: { isActive: false } });
    await expect(requireUserById(customer.id)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});

describe("تقييد محاولات تسجيل الدخول", () => {
  it("يقفل المحاولات بعد الحد الأقصى ثم يفتحها بعد المسح", async () => {
    const key = await loginAttemptKey("User@Example.com", "10.0.0.1");

    await expect(assertLoginAllowed(key)).resolves.toBeUndefined();

    await recordLoginFailure(key);
    await recordLoginFailure(key);
    await expect(assertLoginAllowed(key)).resolves.toBeUndefined();

    await recordLoginFailure(key);
    await expect(assertLoginAllowed(key)).rejects.toThrow(/إيقاف المحاولات/);

    const attempt = await prisma.loginAttempt.findUniqueOrThrow({ where: { key } });
    expect(attempt.count).toBe(3);
    expect(attempt.lockedUntil).toBeInstanceOf(Date);

    await clearLoginAttempts(key);
    await expect(assertLoginAllowed(key)).resolves.toBeUndefined();
  });

  it("يعزل المحاولات حسب البريد وعنوان IP", async () => {
    const first = await loginAttemptKey("a@test.local", "10.0.0.1");
    const second = await loginAttemptKey("a@test.local", "10.0.0.2");
    const third = await loginAttemptKey("b@test.local", "10.0.0.1");

    expect(first).not.toBe(second);
    expect(first).not.toBe(third);
    expect(first).toHaveLength(64);
  });
});

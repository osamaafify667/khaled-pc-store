"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import {
  assertLoginAllowed,
  clearLoginAttempts,
  createSession,
  deleteSession,
  getRequestMeta,
  loginAttemptKey,
  recordLoginFailure,
  SESSION_COOKIE,
  verifyPassword,
} from "@/server/auth";
import { recordAuditOutsideTransaction } from "@/server/audit";

export type AuthState = { error?: string; fieldErrors?: Record<string, string> };

async function startSession(userId: string, next: string) {
  const meta = await getRequestMeta();
  const session = await createSession(userId, meta);
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  redirect(next);
}

/**
 * دخول لوحة التحكم بكلمة مرور فقط — بدون بريد إلكتروني.
 * يتم التحقق من كلمة المرور مقابل حسابات المديرين النشطين، مع نفس حماية
 * محاولات الدخول المستخدمة سابقًا. لا يوجد رابط ظاهر لهذه الصفحة في المتجر.
 */
export async function adminLoginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "كلمة المرور مطلوبة" }, error: "أدخل كلمة مرور لوحة التحكم" };
  if (password.length > 200) return { error: "كلمة المرور غير صحيحة" };

  const nextRaw = String(formData.get("next") ?? "");
  const next = nextRaw.startsWith("/admin") && !nextRaw.startsWith("//") ? nextRaw : "/admin";

  const meta = await getRequestMeta();
  const key = await loginAttemptKey("admin-panel", meta.ip);

  try {
    await assertLoginAllowed(key);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "محاولات كثيرة. حاول لاحقًا." };
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, passwordHash: true },
    take: 25,
  });

  let adminId: string | null = null;
  for (const admin of admins) {
    if (await verifyPassword(password, admin.passwordHash)) {
      adminId = admin.id;
      break;
    }
  }

  if (!adminId) {
    await recordLoginFailure(key);
    return { error: "كلمة المرور غير صحيحة" };
  }

  await clearLoginAttempts(key);
  await prisma.user.update({ where: { id: adminId }, data: { lastLoginAt: new Date() } });
  await recordAuditOutsideTransaction({
    userId: adminId,
    action: "AUTH_LOGIN",
    entity: "User",
    entityId: adminId,
    ip: meta.ip,
    details: { panel: "admin" },
  });

  await startSession(adminId, next);
  return {};
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
  redirect("/");
}

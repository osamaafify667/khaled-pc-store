"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { hashPassword, requireAdmin } from "@/server/auth";
import { recordAudit } from "@/server/audit";

export type UserAdminState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

const createUserSchema = z.object({
  name: z.string().trim().min(3, "الاسم مطلوب").max(80),
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(100),
  role: z.enum(["CUSTOMER", "ADMIN"]),
});

export async function createAdminUserAction(_prev: UserAdminState, formData: FormData): Promise<UserAdminState> {
  const admin = await requireAdmin();
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "تحقق من البيانات",
      fieldErrors: { [parsed.error.errors[0]?.path.join(".") ?? "form"]: parsed.error.errors[0]?.message ?? "" },
    };
  }
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { fieldErrors: { email: "البريد مستخدم بالفعل" }, error: "البريد مستخدم بالفعل" };

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    },
  });
  await recordAudit(prisma, {
    userId: admin.id,
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    details: { email: user.email, role: user.role },
  });
  revalidatePath("/admin/users");
  return { ok: true, message: "تم إنشاء المستخدم" };
}

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "CUSTOMER";
  if (!userId || userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  if (target.role === "ADMIN" && role === "CUSTOMER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (adminCount <= 1) return;
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await recordAudit(prisma, {
    userId: admin.id,
    action: "USER_ROLE_CHANGED",
    entity: "User",
    entityId: userId,
    details: { from: target.role, to: role },
  });
  revalidatePath("/admin/users");
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === admin.id) return;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (target.role === "ADMIN" && target.isActive) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (adminCount <= 1) return;
  }
  await prisma.user.update({ where: { id: userId }, data: { isActive: !target.isActive } });
  await recordAudit(prisma, {
    userId: admin.id,
    action: target.isActive ? "USER_DISABLED" : "USER_ENABLED",
    entity: "User",
    entityId: userId,
  });
  revalidatePath("/admin/users");
}

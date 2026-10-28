import { ShieldCheck, UserCog } from "lucide-react";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { toggleUserActiveAction, updateUserRoleAction } from "@/actions/admin/users";
import { UserCreateForm } from "@/components/admin/user-create-form";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "المستخدمون" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { orders: true, sessions: true } },
    },
  });

  const admins = users.filter((user) => user.role === "ADMIN");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">المستخدمون والصلاحيات</h1>
        <p className="mt-1 text-xs text-slate-400">
          {admins.length} إداري · {users.length - admins.length} عميل. لا يمكن تعطيل آخر إداري نشط.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="table-wrap">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الدور</th>
                <th>الطلبات</th>
                <th>آخر دخول</th>
                <th>الحالة</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="text-xs font-bold text-slate-200">
                      {user.name}
                      {user.id === admin.id ? <span className="mr-1 text-[9px] text-accent">(أنت)</span> : null}
                    </p>
                    <p className="text-[10px] text-slate-500" dir="ltr">{user.email}</p>
                  </td>
                  <td>
                    <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
                      {user.role === "ADMIN" ? <ShieldCheck className="h-3 w-3" /> : <UserCog className="h-3 w-3" />}
                      {user.role === "ADMIN" ? "إداري" : "عميل"}
                    </Badge>
                  </td>
                  <td className="text-xs text-slate-400">
                    {user._count.orders}
                    <span className="block text-[9px] text-slate-600">{user._count.sessions} جلسة</span>
                  </td>
                  <td className="text-[10px] text-slate-500">{user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "لم يدخل بعد"}</td>
                  <td>
                    <span className={user.isActive ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300" : "rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-300"}>
                      {user.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td>
                    {user.id === admin.id ? (
                      <span className="text-[10px] text-slate-600">—</span>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <form action={updateUserRoleAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value={user.role === "ADMIN" ? "CUSTOMER" : "ADMIN"} />
                          <button type="submit" className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-slate-400 hover:border-accent/40 hover:text-accent">
                            {user.role === "ADMIN" ? "تحويل لعميل" : "ترقية لإداري"}
                          </button>
                        </form>
                        <form action={toggleUserActiveAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button type="submit" className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-slate-400 hover:border-rose-500/40 hover:text-rose-300">
                            {user.isActive ? "تعطيل" : "تفعيل"}
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface h-fit p-5">
          <h2 className="text-base">إضافة مستخدم</h2>
          <p className="mt-1 text-[11px] leading-6 text-slate-500">
            أنشئ حساب إداري جديد أو حساب عميل يدويًا. استخدم كلمة مرور قوية وسلّمها بأمان.
          </p>
          <div className="mt-4">
            <UserCreateForm />
          </div>
        </div>
      </div>
    </div>
  );
}

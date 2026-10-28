import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/server/db";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTimeShort, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "سجل النشاط" };

type PageProps = { searchParams: Promise<{ q?: string; entity?: string; page?: string }> };

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const entity = params.entity ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where = {
    ...(entity ? { entity } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { entityId: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [logs, total, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
  ]);

  const totalPages = Math.max(Math.ceil(total / ADMIN_PAGE_SIZE), 1);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (entity) query.set("entity", entity);
  const hrefFor = (target: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/admin/audit?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">سجل النشاط</h1>
        <p className="mt-1 text-xs text-slate-400">
          {formatNumber(total)} حدث — كل إجراء إداري حساس يُسجَّل مع المستخدم والوقت.
        </p>
      </div>

      <form action="/admin/audit" className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:min-w-[220px] sm:flex-1">
          <Input name="q" defaultValue={q} placeholder="نوع الإجراء، معرف الكيان، أو بريد المستخدم…" aria-label="بحث السجل" />
        </div>
        <div className="w-full sm:w-48">
          <Select name="entity" defaultValue={entity} aria-label="نوع الكيان">
            <option value="">كل الكيانات</option>
            {entities.map((row) => (
              <option key={row.entity} value={row.entity}>
                {row.entity}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          <Search className="h-4 w-4" />
          بحث
        </Button>
        {q || entity ? (
          <Link href="/admin/audit" className="text-xs font-bold text-slate-400 hover:text-accent">
            مسح
          </Link>
        ) : null}
      </form>

      <div className="table-wrap">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>الإجراء</th>
              <th>الكيان</th>
              <th>المستخدم</th>
              <th>الطلب</th>
              <th>IP</th>
              <th>تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                  لا توجد أحداث مطابقة.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-[10px] text-slate-500">{formatDateTimeShort(log.createdAt)}</td>
                  <td className="text-[11px] font-bold text-slate-200">{log.action}</td>
                  <td className="text-[10px] text-slate-400">
                    {log.entity}
                    {log.entityId ? <span className="block font-mono text-[9px] text-slate-600">{log.entityId.slice(0, 10)}…</span> : null}
                  </td>
                  <td className="text-[10px] text-slate-400">{log.user?.name ?? "النظام"}</td>
                  <td className="text-[10px]">
                    {log.order ? (
                      <Link href={`/admin/orders/${log.order.id}`} className="font-mono font-bold text-accent hover:underline" dir="ltr">
                        {log.order.orderNumber}
                      </Link>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="font-mono text-[9px] text-slate-600" dir="ltr">{log.ip ?? "—"}</td>
                  <td className="max-w-[240px] truncate text-[9px] text-slate-600" title={log.details ? JSON.stringify(log.details) : ""}>
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}

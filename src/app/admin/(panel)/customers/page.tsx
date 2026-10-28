import Link from "next/link";
import { Search, Users } from "lucide-react";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatDate, formatNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "العملاء" };

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const search = q.trim();

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      isActive: true,
      _count: { select: { orders: true } },
    },
  });

  const totals = await prisma.order.groupBy({
    by: ["userId"],
    where: {
      userId: { in: customers.map((customer) => customer.id) },
      status: { not: "CANCELLED" },
    },
    _sum: { total: true },
    _max: { placedAt: true },
  });
  const totalMap = new Map(totals.map((row) => [row.userId, row]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">العملاء</h1>
        <p className="mt-1 text-xs text-slate-400">آخر {formatNumber(customers.length)} حساب عميل — إجمالي الطلبات غير الملغاة.</p>
      </div>

      <form action="/admin/customers" className="surface flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[240px] flex-1">
          <Input name="q" defaultValue={search} placeholder="ابحث بالاسم أو البريد أو الهاتف…" aria-label="بحث العملاء" />
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
          بحث
        </Button>
        {search ? (
          <Link href="/admin/customers" className="text-xs font-bold text-slate-400 hover:text-accent">
            مسح
          </Link>
        ) : null}
      </form>

      <div className="table-wrap">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>العميل</th>
              <th>الهاتف</th>
              <th>الطلبات</th>
              <th>إجمالي الشراء</th>
              <th>آخر طلب</th>
              <th>انضم</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                  <Users className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                  لا يوجد عملاء مطابقون.
                </td>
              </tr>
            ) : (
              customers.map((customer) => {
                const row = totalMap.get(customer.id);
                return (
                  <tr key={customer.id}>
                    <td>
                      <p className="text-xs font-bold text-slate-200">{customer.name}</p>
                      <p className="text-[10px] text-slate-500" dir="ltr">{customer.email}</p>
                      {!customer.isActive ? <span className="text-[9px] text-rose-300">معطّل</span> : null}
                    </td>
                    <td className="text-[10px] text-slate-400" dir="ltr">{customer.phone || "—"}</td>
                    <td className="text-xs text-slate-300">{customer._count.orders}</td>
                    <td className="text-xs font-bold text-white">{formatPrice(row?._sum.total ?? 0)}</td>
                    <td className="text-[10px] text-slate-500">{row?._max.placedAt ? formatDate(row._max.placedAt) : "—"}</td>
                    <td className="text-[10px] text-slate-500">{formatDate(customer.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

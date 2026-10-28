import Link from "next/link";
import { ArrowRight, Percent } from "lucide-react";
import { prisma } from "@/server/db";
import { CouponForm } from "@/components/admin/catalog-forms";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "الكوبونات" };

type PageProps = { searchParams: Promise<{ edit?: string }> };

function toLocalInput(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default async function AdminCouponsPage({ searchParams }: PageProps) {
  const { edit } = await searchParams;
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const editing = edit ? coupons.find((coupon) => coupon.id === edit) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">الكوبونات</h1>
        <p className="mt-1 text-xs text-slate-400">أكواد الخصم تُتحقق على السيرفر عند إتمام الطلب.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الخصم</th>
                <th>حد أدنى</th>
                <th>الاستخدام</th>
                <th>الفترة</th>
                <th>الحالة</th>
                <th aria-label="تعديل" />
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    لا توجد كوبونات بعد.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-accent" />
                        <span className="font-mono text-xs font-bold text-white" dir="ltr">{coupon.code}</span>
                      </span>
                    </td>
                    <td className="text-xs text-slate-200">
                      {coupon.type === "PERCENT" ? `${Number(coupon.value)}%` : formatPrice(coupon.value)}
                    </td>
                    <td className="text-xs text-slate-400">{Number(coupon.minSubtotal) > 0 ? formatPrice(coupon.minSubtotal) : "—"}</td>
                    <td className="text-xs text-slate-400">
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td className="text-[10px] text-slate-500">
                      {coupon.startsAt ? formatDate(coupon.startsAt) : "—"} → {coupon.endsAt ? formatDate(coupon.endsAt) : "—"}
                    </td>
                    <td>
                      <span className={coupon.isActive ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300" : "rounded-full border border-line px-2 py-0.5 text-[9px] font-bold text-slate-500"}>
                        {coupon.isActive ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td className="text-left">
                      <Link href={`/admin/coupons?edit=${coupon.id}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20">
                        تعديل
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="surface h-fit p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base">{editing ? "تعديل الكوبون" : "إضافة كوبون"}</h2>
            {editing ? (
              <Link href="/admin/coupons" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-accent">
                <ArrowRight className="h-3 w-3" />
                إلغاء
              </Link>
            ) : null}
          </div>
          <div className="mt-4">
            <CouponForm
              key={editing?.id ?? "new"}
              coupon={
                editing
                  ? {
                      id: editing.id,
                      code: editing.code,
                      type: editing.type,
                      value: editing.value.toString(),
                      minSubtotal: editing.minSubtotal.toString(),
                      maxUses: editing.maxUses,
                      startsAt: toLocalInput(editing.startsAt),
                      endsAt: toLocalInput(editing.endsAt),
                      isActive: editing.isActive,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

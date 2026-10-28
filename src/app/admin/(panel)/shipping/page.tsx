import Link from "next/link";
import { ArrowRight, Trash2, Truck } from "lucide-react";
import { prisma } from "@/server/db";
import { deleteShippingZoneAction } from "@/actions/admin/catalog";
import { ShippingZoneForm } from "@/components/admin/catalog-forms";
import { EGYPT_GOVERNORATES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "الشحن" };

type PageProps = { searchParams: Promise<{ edit?: string }> };

export default async function AdminShippingPage({ searchParams }: PageProps) {
  const { edit } = await searchParams;
  const [zones, settings] = await Promise.all([
    prisma.shippingZone.findMany({ orderBy: [{ sortOrder: "asc" }, { governorate: "asc" }] }),
    prisma.storeSettings.findUnique({ where: { id: 1 } }),
  ]);
  const editing = edit ? zones.find((zone) => zone.id === edit) : undefined;
  const covered = new Set(zones.filter((zone) => zone.isActive).map((zone) => zone.governorate));
  const missing = EGYPT_GOVERNORATES.filter((governorate) => !covered.has(governorate));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">الشحن</h1>
        <p className="mt-1 text-xs text-slate-400">
          رسوم الشحن لكل محافظة. عند عدم وجود منطقة للمحافظة تُستخدم الرسوم الافتراضية من الإعدادات.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="text-[11px] text-slate-500">مناطق نشطة</p>
          <p className="mt-1 text-xl font-extrabold text-white">{covered.size}</p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] text-slate-500">محافظات بدون منطقة</p>
          <p className="mt-1 text-xl font-extrabold text-amber-300">{missing.length}</p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] text-slate-500">الرسوم الافتراضية</p>
          <p className="mt-1 text-xl font-extrabold text-white">{formatPrice(settings?.shippingFlatFee ?? 0)}</p>
        </div>
      </div>

      {missing.length > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[11px] leading-6 text-amber-200">
          محافظات بدون منطقة شحن مخصصة: {missing.slice(0, 8).join("، ")}
          {missing.length > 8 ? ` و${missing.length - 8} أخرى` : ""}. أضف مناطق لها لضبط الرسوم.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="table-wrap overflow-visible">
          <table className="data-table">
            <thead>
              <tr>
                <th>المحافظة</th>
                <th>الرسوم</th>
                <th>المدة</th>
                <th>الدفع عند الاستلام</th>
                <th>الحالة</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    لا توجد مناطق شحن بعد. أضف أول محافظة.
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id}>
                    <td className="text-xs font-bold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-accent" />
                        {zone.governorate}
                      </span>
                    </td>
                    <td className="text-xs font-bold text-white">{formatPrice(zone.fee)}</td>
                    <td className="text-[10px] text-slate-400">{zone.estimatedDays || "—"}</td>
                    <td className="text-[10px] text-slate-400">{zone.codAvailable ? "متاح" : "غير متاح"}</td>
                    <td>
                      <span className={zone.isActive ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300" : "rounded-full border border-line px-2 py-0.5 text-[9px] font-bold text-slate-500"}>
                        {zone.isActive ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/shipping?edit=${zone.id}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20">
                          تعديل
                        </Link>
                        <form action={deleteShippingZoneAction}>
                          <input type="hidden" name="id" value={zone.id} />
                          <button type="submit" className="rounded-lg border border-line px-2 py-1 text-slate-400 hover:border-rose-500/40 hover:text-rose-300" aria-label="حذف المنطقة">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="surface h-fit p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base">{editing ? "تعديل منطقة" : "إضافة منطقة"}</h2>
            {editing ? (
              <Link href="/admin/shipping" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-accent">
                <ArrowRight className="h-3 w-3" />
                إلغاء
              </Link>
            ) : null}
          </div>
          <div className="mt-4">
            <ShippingZoneForm
              key={editing?.id ?? "new"}
              zone={
                editing
                  ? {
                      id: editing.id,
                      governorate: editing.governorate,
                      fee: editing.fee.toString(),
                      codAvailable: editing.codAvailable,
                      estimatedDays: editing.estimatedDays,
                      isActive: editing.isActive,
                      sortOrder: editing.sortOrder,
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

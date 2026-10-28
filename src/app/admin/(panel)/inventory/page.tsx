import Link from "next/link";
import { History, PackageSearch, Search } from "lucide-react";
import { prisma } from "@/server/db";
import { availableQuantity } from "@/server/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StockAdjustForm } from "@/components/admin/stock-adjust-form";
import { cn, formatDateTimeShort, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "المخزون" };

type PageProps = { searchParams: Promise<{ filter?: string; q?: string }> };

const FILTERS = [
  { value: "", label: "الكل" },
  { value: "low", label: "منخفض" },
  { value: "out", label: "نفد" },
  { value: "reserved", label: "محجوز" },
];

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const { filter = "", q = "" } = await searchParams;

  const rows = await prisma.inventory.findMany({
    where: q
      ? {
          product: {
            OR: [
              { nameAr: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      product: { select: { id: true, nameAr: true, slug: true, sku: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const enriched = rows.map((row) => {
    const available = availableQuantity(row);
    return { ...row, available, isLow: available > 0 && available <= row.lowStockThreshold, isOut: available <= 0 };
  });

  const filtered = enriched.filter((row) => {
    if (filter === "low") return row.isLow;
    if (filter === "out") return row.isOut;
    if (filter === "reserved") return row.reserved > 0;
    return true;
  });

  const counts = {
    all: enriched.length,
    low: enriched.filter((row) => row.isLow).length,
    out: enriched.filter((row) => row.isOut).length,
    reserved: enriched.filter((row) => row.reserved > 0).length,
  };

  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      product: { select: { nameAr: true, sku: true, id: true } },
      user: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">المخزون</h1>
          <p className="mt-1 text-xs text-slate-400">
            المتاح = الكمية − المحجوز. كل تعديل يُسجَّل باسم المستخدم والسبب.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-ink-900/60 p-1">
          {FILTERS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/inventory${option.value ? `?filter=${option.value}` : ""}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                filter === option.value ? "bg-accent/15 text-accent" : "text-slate-400 hover:text-white",
              )}
            >
              {option.label}
              <span className="mr-1 text-[9px] opacity-70">{counts[(option.value || "all") as keyof typeof counts]}</span>
            </Link>
          ))}
        </div>
      </div>

      <form action="/admin/inventory" className="surface flex flex-wrap items-center gap-3 p-4">
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <div className="w-full sm:min-w-[220px] sm:flex-1">
          <Input name="q" defaultValue={q} placeholder="ابحث باسم المنتج أو SKU…" aria-label="بحث المخزون" />
        </div>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          <Search className="h-4 w-4" />
          بحث
        </Button>
        {q ? (
          <Link href={`/admin/inventory${filter ? `?filter=${filter}` : ""}`} className="text-xs font-bold text-slate-400 hover:text-accent">
            مسح البحث
          </Link>
        ) : null}
      </form>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="surface px-6 py-12 text-center text-xs text-slate-500">
            <PackageSearch className="mx-auto mb-2 h-6 w-6 text-slate-600" />
            لا توجد صفوف مخزون مطابقة.
          </div>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/products/${row.product.id}`} className="text-sm font-bold text-white hover:text-accent">
                    {row.product.nameAr}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-slate-500" dir="ltr">
                    {row.product.sku}
                    {row.product.status !== "ACTIVE" ? " · غير منشور" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={row.isOut ? "danger" : row.isLow ? "warning" : "success"}>
                    المتاح {row.available}
                  </Badge>
                  <span className="rounded-lg border border-line px-2 py-1 text-[10px] text-slate-400">الكمية {row.quantity}</span>
                  <span className="rounded-lg border border-line px-2 py-1 text-[10px] text-slate-400">محجوز {row.reserved}</span>
                  <span className="rounded-lg border border-line px-2 py-1 text-[10px] text-slate-400">الحد {row.lowStockThreshold}</span>
                  <span className="text-[10px] text-slate-600">{formatDateTimeShort(row.updatedAt)}</span>
                </div>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-bold text-accent hover:underline">تعديل المخزون</summary>
                <StockAdjustForm productId={row.product.id} available={row.available} />
              </details>
            </div>
          ))
        )}
      </div>

      <div className="surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <History className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-white">آخر حركات المخزون</h2>
          <span className="text-[10px] text-slate-500">آخر {formatNumber(movements.length)} حركة</span>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المنتج</th>
                <th>النوع</th>
                <th>التغيير</th>
                <th>الرصيد</th>
                <th>السبب</th>
                <th>بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    لا توجد حركات مخزون بعد.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="text-[10px] text-slate-500">{formatDateTimeShort(movement.createdAt)}</td>
                    <td className="text-xs">
                      <Link href={`/admin/products/${movement.product.id}`} className="font-bold text-slate-200 hover:text-accent">
                        {movement.product.nameAr}
                      </Link>
                      <span className="block text-[9px] text-slate-500" dir="ltr">{movement.product.sku}</span>
                    </td>
                    <td className="text-[10px] text-slate-400">{movement.type}</td>
                    <td className={cn("text-xs font-bold", movement.quantityChange >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}
                    </td>
                    <td className="text-xs text-slate-300">{movement.balanceAfter}</td>
                    <td className="max-w-[220px] text-[10px] text-slate-500">{movement.reason || "—"}</td>
                    <td className="text-[10px] text-slate-400">{movement.user?.name ?? "النظام"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Download, Plus, Search, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/server/db";
import { ADMIN_PAGE_SIZE, PRODUCT_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { cn, formatDateTimeShort, formatNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "المنتجات" };

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string; sort?: string }>;
};

const STATUS_TONES: Record<string, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  ARCHIVED: "neutral",
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(params.status ?? "") ? params.status! : "";
  const categorySlug = params.category ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const sort = params.sort ?? "newest";

  const where = {
    ...(status ? { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(q
      ? {
          OR: [
            { nameAr: { contains: q, mode: "insensitive" as const } },
            { nameEn: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "sales"
      ? [{ salesCount: "desc" as const }]
      : sort === "price"
        ? [{ price: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const [items, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { nameAr: true, slug: true } },
        brand: { select: { name: true } },
        inventory: true,
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true } }),
  ]);

  const totalPages = Math.max(Math.ceil(total / ADMIN_PAGE_SIZE), 1);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (categorySlug) query.set("category", categorySlug);
  if (sort !== "newest") query.set("sort", sort);
  const exportQuery = query.toString();
  const hrefFor = (target: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/admin/products?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">المنتجات</h1>
          <p className="mt-1 text-xs text-slate-400">
            {formatNumber(total)} منتج — إدارة الأسعار والمخزون والمواصفات والنشر.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/products/export${exportQuery ? `?${exportQuery}` : ""}`} className={buttonClasses("outline", "md")}>
            <Download className="h-4 w-4" />
            تصدير CSV
          </Link>
          <Link href="/admin/products/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" />
            منتج جديد
          </Link>
        </div>
      </div>

      <form className="surface flex flex-wrap items-end gap-3 p-4" action="/admin/products">
        <div className="min-w-[200px] flex-1">
          <Input name="q" defaultValue={q} placeholder="ابحث بالاسم أو SKU أو الموديل…" aria-label="بحث المنتجات" />
        </div>
        <div className="w-40">
          <Select name="status" defaultValue={status} aria-label="حالة المنتج">
            <option value="">كل الحالات</option>
            <option value="ACTIVE">منشور</option>
            <option value="DRAFT">مسودة</option>
            <option value="ARCHIVED">مؤرشف</option>
          </Select>
        </div>
        <div className="w-44">
          <Select name="category" defaultValue={categorySlug} aria-label="التصنيف">
            <option value="">كل التصنيفات</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.nameAr}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select name="sort" defaultValue={sort} aria-label="الترتيب">
            <option value="newest">الأحدث</option>
            <option value="sales">الأكثر مبيعًا</option>
            <option value="price">الأعلى سعرًا</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          <SlidersHorizontal className="h-4 w-4" />
          تطبيق
        </Button>
        {q || status || categorySlug || sort !== "newest" ? (
          <Link href="/admin/products" className="text-xs font-bold text-slate-400 hover:text-accent">
            مسح الفلاتر
          </Link>
        ) : null}
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>التصنيف</th>
              <th>السعر</th>
              <th>المتاح</th>
              <th>الحالة</th>
              <th>أُضيف</th>
              <th aria-label="إجراءات" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                  <Search className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                  لا توجد منتجات مطابقة. عدّل الفلاتر أو أضف منتجًا جديدًا.
                </td>
              </tr>
            ) : (
              items.map((product) => {
                const available = Math.max((product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0), 0);
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-900">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[9px] text-slate-600">لا صورة</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${product.id}`} className="line-clamp-1 text-xs font-bold text-white hover:text-accent">
                            {product.nameAr}
                          </Link>
                          <p className="mt-0.5 text-[10px] text-slate-500" dir="ltr">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-slate-400">
                      {product.category.nameAr}
                      {product.brand ? <span className="block text-[10px] text-slate-500">{product.brand.name}</span> : null}
                    </td>
                    <td className="text-xs font-bold text-white">{formatPrice(product.price)}</td>
                    <td>
                      <span className={cn("text-xs font-bold", available === 0 ? "text-rose-300" : available <= (product.inventory?.lowStockThreshold ?? 3) ? "text-amber-300" : "text-slate-300")}>
                        {available}
                      </span>
                      <span className="block text-[10px] text-slate-500">من {product.inventory?.quantity ?? 0}</span>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONES[product.status] ?? "neutral"}>{PRODUCT_STATUS_LABELS[product.status]}</Badge>
                    </td>
                    <td className="text-[10px] text-slate-500">{formatDateTimeShort(product.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/product/${product.slug}`} target="_blank" className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-accent">
                          عرض
                        </Link>
                        <Link href={`/admin/products/${product.id}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20">
                          تعديل
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />

      <CsvImportForm />
    </div>
  );
}

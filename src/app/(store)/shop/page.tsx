import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, Search } from "lucide-react";
import { getBrands, getCategories, getStoreProducts } from "@/server/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ShopFilters, ActiveFilters } from "@/components/store/shop-filters";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { formatNumber, firstParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المتجر — كل قطع الكمبيوتر",
  description: "تسوق المعالجات، كروت الشاشة، الرامات، اللوحات الأم، التخزين، الشاشات والملحقات بأسعار واضحة وضمان.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث" },
  { value: "best", label: "الأكثر مبيعًا" },
  { value: "price_asc", label: "السعر: من الأقل للأعلى" },
  { value: "price_desc", label: "السعر: من الأعلى للأقل" },
] as const;

function parseSort(value: string | undefined) {
  if (value === "price_asc" || value === "price_desc" || value === "best") return value;
  return "newest" as const;
}

function toSortParam(sort: string | undefined) {
  if (sort === "price_asc") return "price_asc" as const;
  if (sort === "price_desc") return "price_desc" as const;
  if (sort === "best") return "best_selling" as const;
  return "newest" as const;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim() || undefined;
  const category = firstParam(params.category) || undefined;
  const brandParam = params.brand;
  const brands = Array.isArray(brandParam) ? brandParam : brandParam ? [brandParam] : [];
  const min = Number(firstParam(params.min));
  const max = Number(firstParam(params.max));
  const minPrice = Number.isFinite(min) && min > 0 ? min : undefined;
  const maxPrice = Number.isFinite(max) && max > 0 ? max : undefined;
  const inStock = firstParam(params.inStock) === "1";
  const sort = parseSort(firstParam(params.sort));
  const page = Math.max(Number(firstParam(params.page) ?? 1) || 1, 1);

  const [result, categories, allBrands] = await Promise.all([
    getStoreProducts({
      search: q,
      category,
      brands,
      minPrice,
      maxPrice,
      inStock,
      sort: toSortParam(sort),
      page,
    }),
    getCategories(),
    getBrands(),
  ]);

  const queryFor = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (category) search.set("category", category);
    for (const brand of brands) search.append("brand", brand);
    if (minPrice) search.set("min", String(minPrice));
    if (maxPrice) search.set("max", String(maxPrice));
    if (inStock) search.set("inStock", "1");
    if (sort !== "newest") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    const value = search.toString();
    return value ? `/shop?${value}` : "/shop";
  };

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "المتجر" }]} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">{q ? `نتائج البحث عن «${q}»` : "كل المنتجات"}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {formatNumber(result.total)} منتج متاح — أسعار محدّثة ومخزون حقيقي.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((option) => {
            const next = new URLSearchParams();
            if (q) next.set("q", q);
            if (category) next.set("category", category);
            for (const brand of brands) next.append("brand", brand);
            if (minPrice) next.set("min", String(minPrice));
            if (maxPrice) next.set("max", String(maxPrice));
            if (inStock) next.set("inStock", "1");
            if (option.value !== "newest") next.set("sort", option.value);
            return (
              <Link
                key={option.value}
                href={`/shop${next.toString() ? `?${next.toString()}` : ""}`}
                className={
                  sort === option.value
                    ? "rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11px] font-bold text-accent"
                    : "rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-accent/30 hover:text-accent"
                }
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <form action="/shop" className="mt-6 flex gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="ابحث في المتجر…"
            className="field pr-10"
            aria-label="البحث في المتجر"
          />
        </div>
        <button type="submit" className={buttonClasses("primary", "md")}>
          بحث
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <ShopFilters
          categories={categories}
          brands={allBrands}
          current={{
            q,
            category,
            brands,
            minPrice: minPrice ? String(minPrice) : undefined,
            maxPrice: maxPrice ? String(maxPrice) : undefined,
            inStock: inStock ? "1" : undefined,
            sort: sort === "newest" ? undefined : sort,
          }}
        />

        <div>
          <ActiveFilters
            categories={categories}
            current={{
              q,
              category,
              brands,
              minPrice: minPrice ? String(minPrice) : undefined,
              maxPrice: maxPrice ? String(maxPrice) : undefined,
              inStock: inStock ? "1" : undefined,
            }}
          />

          {result.items.length > 0 ? (
            <>
              <ProductGrid products={result.items} />
              <Pagination page={result.page} totalPages={result.totalPages} hrefFor={queryFor} />
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title="لا توجد منتجات مطابقة"
              description="جرّب تعديل كلمات البحث أو إزالة بعض عوامل التصفية. يمكنك أيضًا تصفح كل التصنيفات."
              action={
                <Link href="/shop" className={buttonClasses("primary", "md")}>
                  عرض كل المنتجات
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

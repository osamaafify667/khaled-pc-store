import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageSearch } from "lucide-react";
import {
  getBrands,
  getCategories,
  getCategoryBySlug,
  getStoreProducts,
} from "@/server/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ShopFilters } from "@/components/store/shop-filters";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon } from "@/components/product/category-icon";
import { buttonClasses } from "@/components/ui/button";
import { firstParam, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "التصنيف غير موجود" };
  return {
    title: category.nameAr,
    description: category.description || `تسوق ${category.nameAr} بأفضل الأسعار في متجر خالد للكمبيوتر.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const brandParam = query.brand;
  const brands = Array.isArray(brandParam) ? brandParam : brandParam ? [brandParam] : [];
  const min = Number(firstParam(query.min));
  const max = Number(firstParam(query.max));
  const minPrice = Number.isFinite(min) && min > 0 ? min : undefined;
  const maxPrice = Number.isFinite(max) && max > 0 ? max : undefined;
  const inStock = firstParam(query.inStock) === "1";
  const sortParam = firstParam(query.sort);
  const sort =
    sortParam === "price_asc" || sortParam === "price_desc" || sortParam === "best" ? sortParam : "newest";
  const page = Math.max(Number(firstParam(query.page) ?? 1) || 1, 1);

  const [result, categories, allBrands] = await Promise.all([
    getStoreProducts({
      category: category.slug,
      brands,
      minPrice,
      maxPrice,
      inStock,
      sort: sort === "best" ? "best_selling" : sort,
      page,
    }),
    getCategories(),
    getBrands(),
  ]);

  const basePath = `/category/${category.slug}`;
  const queryFor = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const brand of brands) search.append("brand", brand);
    if (minPrice) search.set("min", String(minPrice));
    if (maxPrice) search.set("max", String(maxPrice));
    if (inStock) search.set("inStock", "1");
    if (sort !== "newest") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    return search.toString() ? `${basePath}?${search.toString()}` : basePath;
  };

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "المتجر", href: "/shop" }, { label: category.nameAr }]} />

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
            <CategoryIcon name={category.icon} className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{category.nameEn}</p>
            <h1 className="mt-1 text-3xl">{category.nameAr}</h1>
            <p className="mt-1 text-sm text-slate-400">{formatNumber(result.total)} منتج</p>
          </div>
        </div>
        {category.children.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link key={child.id} href={`/category/${child.slug}`} className={buttonClasses("outline", "sm")}>
                {child.nameAr}
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {category.description ? (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">{category.description}</p>
      ) : null}

      <div className="mt-7 grid gap-6 lg:grid-cols-[240px_1fr]">
        <ShopFilters
          categories={categories}
          brands={allBrands}
          basePath={basePath}
          hideCategory
          current={{
            category: category.slug,
            brands,
            minPrice: minPrice ? String(minPrice) : undefined,
            maxPrice: maxPrice ? String(maxPrice) : undefined,
            inStock: inStock ? "1" : undefined,
            sort: sort === "newest" ? undefined : sort,
          }}
        />

        <div>
          {result.items.length > 0 ? (
            <>
              <ProductGrid products={result.items} />
              <Pagination page={result.page} totalPages={result.totalPages} hrefFor={queryFor} />
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title="لا توجد منتجات في هذا التصنيف بعد"
              description="نعمل على إضافة منتجات جديدة. تصفح باقي التصنيفات أو تواصل معنا لطلب قطعة محددة."
              action={
                <Link href="/shop" className={buttonClasses("primary", "md")}>
                  تصفح كل المنتجات
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

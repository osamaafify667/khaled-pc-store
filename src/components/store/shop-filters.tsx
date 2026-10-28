import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

type FilterCategory = { slug: string; nameAr: string };
type FilterBrand = { slug: string; name: string; _count?: { products: number } };

export function ShopFilters({
  categories,
  brands,
  current,
  basePath = "/shop",
  hideCategory = false,
}: {
  categories: FilterCategory[];
  brands: FilterBrand[];
  current: {
    q?: string;
    category?: string;
    brands?: string[];
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: string;
  };
  basePath?: string;
  hideCategory?: boolean;
}) {
  const selectedBrands = new Set(current.brands ?? []);

  return (
    <aside className="surface h-fit p-4 lg:sticky lg:top-40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          تصفية النتائج
        </h2>
        <Link href={basePath} className="text-[11px] font-semibold text-slate-400 transition hover:text-accent">
          مسح الكل
        </Link>
      </div>

      <form action={basePath} className="space-y-5">
        {current.q ? <input type="hidden" name="q" value={current.q} /> : null}
        {current.sort ? <input type="hidden" name="sort" value={current.sort} /> : null}

        {!hideCategory ? (
          <fieldset>
            <legend className="mb-2 text-xs font-bold text-slate-300">التصنيف</legend>
            <div className="max-h-56 space-y-1 overflow-y-auto pl-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-ink-800">
                <input type="radio" name="category" value="" defaultChecked={!current.category} className="accent-[#2ee6a8]" />
                كل التصنيفات
              </label>
              {categories.map((category) => (
                <label
                  key={category.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-ink-800"
                >
                  <input
                    type="radio"
                    name="category"
                    value={category.slug}
                    defaultChecked={current.category === category.slug}
                    className="accent-[#2ee6a8]"
                  />
                  {category.nameAr}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          current.category ? <input type="hidden" name="category" value={current.category} /> : null
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-slate-300">الشركة</legend>
          <div className="max-h-52 space-y-1 overflow-y-auto pl-1">
            {brands.length === 0 ? <p className="text-xs text-slate-500">لا توجد شركات بعد.</p> : null}
            {brands.map((brand) => (
              <label
                key={brand.slug}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-ink-800"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="brand"
                    value={brand.slug}
                    defaultChecked={selectedBrands.has(brand.slug)}
                    className="accent-[#2ee6a8]"
                  />
                  {brand.name}
                </span>
                {typeof brand._count?.products === "number" ? (
                  <span className="text-[10px] text-slate-500">{formatNumber(brand._count.products)}</span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-slate-300">السعر (ج.م)</legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="min"
              min={0}
              placeholder="من"
              defaultValue={current.minPrice}
              className="field h-9 px-2 text-xs"
              aria-label="أقل سعر"
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              name="max"
              min={0}
              placeholder="إلى"
              defaultValue={current.maxPrice}
              className="field h-9 px-2 text-xs"
              aria-label="أعلى سعر"
            />
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" name="inStock" value="1" defaultChecked={current.inStock === "1"} className="accent-[#2ee6a8]" />
          المتوفر فقط
        </label>

        <button type="submit" className={buttonClasses("primary", "sm", "w-full")}>
          تطبيق التصفية
        </button>
      </form>
    </aside>
  );
}

export function ActiveFilters({
  current,
  categories,
  basePath = "/shop",
}: {
  current: {
    q?: string;
    category?: string;
    brands?: string[];
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  };
  categories: FilterCategory[];
  basePath?: string;
}) {
  const chips: Array<{ label: string; href: string }> = [];
  const category = categories.find((item) => item.slug === current.category);
  if (current.q) chips.push({ label: `بحث: ${current.q}`, href: basePath });
  if (category) chips.push({ label: category.nameAr, href: basePath });
  for (const brand of current.brands ?? []) {
    chips.push({ label: brand, href: basePath });
  }
  if (current.minPrice || current.maxPrice) {
    chips.push({ label: `السعر: ${current.minPrice ?? "0"} – ${current.maxPrice ?? "∞"}`, href: basePath });
  }
  if (current.inStock === "1") chips.push({ label: "المتوفر فقط", href: basePath });

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold text-slate-500">التصفية النشطة:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-800/70 px-3 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-accent/30 hover:text-accent"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </Link>
      ))}
    </div>
  );
}

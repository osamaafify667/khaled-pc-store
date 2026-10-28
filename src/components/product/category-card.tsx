import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { formatNumber } from "@/lib/utils";

export function CategoryCard({
  category,
}: {
  category: { slug: string; nameAr: string; nameEn: string; icon: string | null; _count?: { products: number } };
}) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group surface surface-hover flex flex-col gap-3 p-4"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-900 text-accent transition group-hover:border-accent/30 group-hover:bg-accent/10">
          <CategoryIcon name={category.icon} />
        </span>
        <ArrowUpLeft className="h-4 w-4 text-slate-600 transition group-hover:text-accent" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white transition group-hover:text-accent">{category.nameAr}</h3>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{category.nameEn}</p>
      </div>
      {typeof category._count?.products === "number" ? (
        <p className="mt-auto text-[11px] text-slate-500">{formatNumber(category._count.products)} منتج</p>
      ) : null}
    </Link>
  );
}

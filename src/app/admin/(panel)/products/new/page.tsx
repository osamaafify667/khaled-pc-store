import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/server/db";
import { ProductForm } from "@/components/admin/product-form";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "منتج جديد" };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, slug: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
            <ArrowRight className="h-3.5 w-3.5" />
            كل المنتجات
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-white">إضافة منتج جديد</h1>
          <p className="mt-1 text-xs text-slate-400">أدخل البيانات والمواصفات بدقة ليظهر المنتج في المتجر وفي فحص التوافق.</p>
        </div>
        {categories.length === 0 ? (
          <Link href="/admin/categories" className={buttonClasses("primary", "sm")}>
            أضف تصنيفًا أولًا
          </Link>
        ) : null}
      </div>

      <ProductForm categories={categories} brands={brands} mode="create" />
    </div>
  );
}

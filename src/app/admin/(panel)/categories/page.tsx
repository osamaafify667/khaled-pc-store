import Link from "next/link";
import { Archive, ArrowRight, ArchiveRestore, Tags } from "lucide-react";
import { prisma } from "@/server/db";
import { archiveCategoryAction } from "@/actions/admin/catalog";
import { CategoryForm } from "@/components/admin/catalog-forms";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "التصنيفات" };

type PageProps = { searchParams: Promise<{ edit?: string }> };

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const { edit } = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const editing = edit ? categories.find((category) => category.id === edit) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">التصنيفات</h1>
        <p className="mt-1 text-xs text-slate-400">تصنيفات المتجر وربطها بخانات منشئ التجميعات.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>التصنيف</th>
                <th>الرابط</th>
                <th>المنتجات</th>
                <th>الحالة</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                    لا توجد تصنيفات. أضف أول تصنيف من النموذج.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 text-accent">
                          <Tags className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{category.nameAr}</p>
                          <p className="text-[10px] text-slate-500">{category.nameEn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-[10px] text-slate-500" dir="ltr">{category.slug}</td>
                    <td className="text-xs text-slate-300">{category._count.products}</td>
                    <td>
                      <span className={category.isActive ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300" : "rounded-full border border-line px-2 py-0.5 text-[9px] font-bold text-slate-500"}>
                        {category.isActive ? "نشط" : "مخفي"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/categories?edit=${category.id}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20">
                          تعديل
                        </Link>
                        <form action={archiveCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <input type="hidden" name="restore" value={category.isActive ? "0" : "1"} />
                          <button type="submit" className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white">
                            {category.isActive ? <Archive className="h-3 w-3" /> : <ArchiveRestore className="h-3 w-3" />}
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
            <h2 className="text-base">{editing ? "تعديل التصنيف" : "إضافة تصنيف"}</h2>
            {editing ? (
              <Link href="/admin/categories" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-accent">
                <ArrowRight className="h-3 w-3" />
                إلغاء
              </Link>
            ) : null}
          </div>
          <div className="mt-4">
            <CategoryForm
              key={editing?.id ?? "new"}
              category={
                editing
                  ? {
                      id: editing.id,
                      nameAr: editing.nameAr,
                      nameEn: editing.nameEn,
                      slug: editing.slug,
                      description: editing.description,
                      icon: editing.icon,
                      sortOrder: editing.sortOrder,
                      isActive: editing.isActive,
                    }
                  : undefined
              }
            />
          </div>

          <div className="mt-5 rounded-xl border border-line bg-ink-900/60 p-3 text-[10px] leading-6 text-slate-500">
            <p className="font-bold text-slate-300">روابط خانات التجميعة</p>
            <p>يجب أن تطابق روابط التصنيفات: cpu, motherboards, gpu, ram, storage, psu, cases, cooling, monitors, accessories.</p>
          </div>
        </div>
      </div>

      <Link href="/admin/products" className={buttonClasses("ghost", "sm")}>
        الانتقال إلى المنتجات
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

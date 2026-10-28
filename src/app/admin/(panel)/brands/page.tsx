import Link from "next/link";
import { Archive, ArchiveRestore, ArrowRight, Boxes } from "lucide-react";
import { prisma } from "@/server/db";
import { archiveBrandAction } from "@/actions/admin/catalog";
import { BrandForm } from "@/components/admin/catalog-forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "الشركات" };

type PageProps = { searchParams: Promise<{ edit?: string }> };

export default async function AdminBrandsPage({ searchParams }: PageProps) {
  const { edit } = await searchParams;
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const editing = edit ? brands.find((brand) => brand.id === edit) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">الشركات</h1>
        <p className="mt-1 text-xs text-slate-400">العلامات التجارية المستخدمة في المنتجات وفلاتر المتجر.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>الشركة</th>
                <th>الرابط</th>
                <th>المنتجات</th>
                <th>الحالة</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                    لا توجد شركات بعد.
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 text-accent">
                          <Boxes className="h-4 w-4" />
                        </span>
                        <p className="text-xs font-bold text-slate-200">{brand.name}</p>
                      </div>
                    </td>
                    <td className="font-mono text-[10px] text-slate-500" dir="ltr">{brand.slug}</td>
                    <td className="text-xs text-slate-300">{brand._count.products}</td>
                    <td>
                      <span className={brand.isActive ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300" : "rounded-full border border-line px-2 py-0.5 text-[9px] font-bold text-slate-500"}>
                        {brand.isActive ? "نشط" : "مخفي"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/brands?edit=${brand.id}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20">
                          تعديل
                        </Link>
                        <form action={archiveBrandAction}>
                          <input type="hidden" name="id" value={brand.id} />
                          <input type="hidden" name="restore" value={brand.isActive ? "0" : "1"} />
                          <button type="submit" className="rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white">
                            {brand.isActive ? <Archive className="h-3 w-3" /> : <ArchiveRestore className="h-3 w-3" />}
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
            <h2 className="text-base">{editing ? "تعديل الشركة" : "إضافة شركة"}</h2>
            {editing ? (
              <Link href="/admin/brands" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-accent">
                <ArrowRight className="h-3 w-3" />
                إلغاء
              </Link>
            ) : null}
          </div>
          <div className="mt-4">
            <BrandForm
              key={editing?.id ?? "new"}
              brand={
                editing
                  ? { id: editing.id, name: editing.name, slug: editing.slug, logoUrl: editing.logoUrl, isActive: editing.isActive }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveRestore, Archive, ArrowRight, ExternalLink, MessageCircle } from "lucide-react";
import { prisma } from "@/server/db";
import { archiveProductAction } from "@/actions/admin/products";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_STATUS_LABELS } from "@/lib/constants";
import { absoluteUrl, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "تعديل منتج" };

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { created } = await searchParams;

  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        specs: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        inventory: true,
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, slug: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  const values: ProductFormValues = {
    id: product.id,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    sku: product.sku,
    slug: product.slug,
    model: product.model,
    categoryId: product.categoryId,
    brandId: product.brandId,
    descriptionAr: product.descriptionAr,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? "",
    warrantyMonths: product.warrantyMonths,
    status: product.status,
    type: product.type,
    isFeatured: product.isFeatured,
    hasBox: product.hasBox,
    quantity: product.inventory?.quantity ?? 0,
    lowStockThreshold: product.inventory?.lowStockThreshold ?? 3,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    specs: product.specs.map((spec) => ({
      key: spec.key,
      label: spec.label,
      value: spec.value,
      numericValue: spec.numericValue === null ? "" : Number(spec.numericValue),
      unit: spec.unit ?? "",
      dataType: spec.dataType,
      group: spec.group ?? "",
      sortOrder: spec.sortOrder,
    })),
    images: product.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt, sortOrder: image.sortOrder })),
  };

  const available = Math.max((product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
            <ArrowRight className="h-3.5 w-3.5" />
            كل المنتجات
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-white">{product.nameAr}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span dir="ltr">{product.sku}</span>
            <Badge tone={product.status === "ACTIVE" ? "success" : product.status === "DRAFT" ? "warning" : "neutral"}>
              {PRODUCT_STATUS_LABELS[product.status]}
            </Badge>
            <span>المتاح: <span className="font-bold text-slate-300">{available}</span></span>
            <span>محجوز: {product.inventory?.reserved ?? 0}</span>
            <span>مبيعات: {product.salesCount}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/product/${product.slug}`} target="_blank" className={buttonClasses("outline", "sm")}>
            <ExternalLink className="h-3.5 w-3.5" />
            عرض في المتجر
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `${product.nameAr}\n${formatPrice(product.price)}\n${absoluteUrl(`/product/${product.slug}`)}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("success", "sm")}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            مشاركة واتساب
          </a>
          <form action={archiveProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="restore" value={product.status === "ACTIVE" ? "0" : "1"} />
            <button type="submit" className={buttonClasses("secondary", "sm")}>
              {product.status === "ACTIVE" ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
              {product.status === "ACTIVE" ? "أرشفة" : "إعادة نشر"}
            </button>
          </form>
        </div>
      </div>

      {created === "1" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200">
          تم إنشاء المنتج. راجع المواصفات والصور ثم انشره من حالة النشر.
        </div>
      ) : null}

      <ProductForm product={values} categories={categories} brands={brands} mode="edit" />
    </div>
  );
}

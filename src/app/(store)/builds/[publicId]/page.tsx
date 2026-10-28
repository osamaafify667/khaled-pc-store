import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBuildByPublicId, getCompatibilityOverrides, toBuilderProduct, type BuilderProduct } from "@/server/builds";
import { getBuilderCatalog } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { SLOT_CATEGORY_SLUGS } from "@/lib/constants";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PcBuilder } from "@/components/builder/pc-builder";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const build = await getBuildByPublicId(publicId);
  if (!build) return { title: "التجميعة غير موجودة" };
  return {
    title: `${build.name} — تجميعة محفوظة`,
    description: `شاهد تفاصيل تجميعة «${build.name}» مع فحص التوافق والسعر الإجمالي.`,
    alternates: { canonical: `/builds/${build.publicId}` },
    robots: { index: false, follow: true },
  };
}

export default async function SharedBuildPage({ params }: PageProps) {
  const { publicId } = await params;
  const [build, overrides, settings, catalog] = await Promise.all([
    getBuildByPublicId(publicId),
    getCompatibilityOverrides(),
    getSettings(),
    getBuilderCatalog(Object.values(SLOT_CATEGORY_SLUGS)),
  ]);
  if (!build) notFound();

  const toItem = (product: Parameters<typeof toBuilderProduct>[0]) =>
    toBuilderProduct({
      id: product.id,
      nameAr: product.nameAr,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      images: product.images,
      brand: product.brand,
      category: product.category,
      inventory: product.inventory,
      specs: product.specs,
    });

  const savedItems = build.items.map((item) => toItem(item.product));
  const savedIds = new Set(savedItems.map((product) => product.id));
  const products: BuilderProduct[] = [...savedItems, ...catalog.filter((product) => !savedIds.has(product.id)).map(toItem)];

  return (
    <div className="container-x py-8">
      <Breadcrumbs
        items={[
          { label: "منشئ التجميعات", href: "/builder" },
          { label: build.name },
        ]}
      />

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">تجميعة محفوظة</p>
        <h1 className="mt-2 text-3xl">{build.name}</h1>
        <p className="mt-2 text-sm text-slate-400">
          هذه تجميعة تم حفظها ومشاركتها من منشئ التجميعات. يمكنك تعديل القطع أو إضافة التجميعة للسلة.
        </p>
      </div>

      <div className="mt-8">
        <PcBuilder
          products={products}
          overrides={overrides}
          whatsapp={settings.whatsapp}
          storeName={settings.storeNameAr}
          initialItems={build.items.map((item) => ({ slot: item.slot, productId: item.product.id }))}
          initialName={build.name}
          shared
        />
      </div>
    </div>
  );
}

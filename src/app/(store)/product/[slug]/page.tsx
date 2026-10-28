import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Cpu,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wrench,
} from "lucide-react";
import {
  availableQuantity,
  getProductBySlug,
  getRelatedProducts,
} from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { ProductGrid } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { AddToCartForm } from "@/components/product/add-to-cart-form";
import { Price } from "@/components/product/price";
import { StockBadge } from "@/components/product/stock-badge";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonClasses } from "@/components/ui/button";
import { absoluteUrl, discountPercent, formatPrice } from "@/lib/utils";
import { toWhatsAppNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "المنتج غير موجود" };
  const title = product.metaTitle || product.nameAr;
  const description =
    product.metaDescription ||
    product.descriptionAr?.slice(0, 160) ||
    `اشترِ ${product.nameAr} من متجر خالد للكمبيوتر بضمان ${product.warrantyMonths} شهر.`;
  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, settings] = await Promise.all([
    getRelatedProducts(product.categoryId, product.id, 4),
    getSettings(),
  ]);

  const available = availableQuantity(product.inventory);
  const percent = discountPercent(Number(product.price), product.compareAtPrice ? Number(product.compareAtPrice) : null);
  const inStock = available > 0;

  const groups = new Map<string, typeof product.specs>();
  for (const spec of product.specs) {
    const group = spec.group || "المواصفات الفنية";
    const list = groups.get(group) ?? [];
    list.push(spec);
    groups.set(group, list);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameAr,
    ...(product.nameEn ? { alternateName: product.nameEn } : {}),
    description: product.descriptionAr || product.nameAr,
    sku: product.sku,
    ...(product.model ? { model: product.model } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.images.length > 0 ? { image: product.images.map((image) => absoluteUrl(image.url)) } : {}),
    offers: {
      "@type": "Offer",
      price: Number(product.price),
      priceCurrency: "EGP",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/product/${product.slug}`),
      seller: { "@type": "Organization", name: settings.storeNameEn },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="container-x py-8">
        <Breadcrumbs
          items={[
            { label: "المتجر", href: "/shop" },
            { label: product.category.nameAr, href: `/category/${product.category.slug}` },
            { label: product.nameAr },
          ]}
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <ProductGallery
            images={product.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))}
            name={product.nameAr}
            categorySlug={product.category.slug}
            badge={
              <>
                {percent ? <Badge tone="danger">خصم {percent}%</Badge> : null}
                {product.type === "PREBUILT" ? <Badge tone="purple">تجميعة جاهزة</Badge> : null}
              </>
            }
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.brand ? (
                <Link href={`/shop?brand=${product.brand.slug}`} className="chip hover:text-accent">
                  {product.brand.name}
                </Link>
              ) : null}
              <span className="chip">{product.category.nameAr}</span>
              {product.model ? <span className="chip font-mono text-[10px]" dir="ltr">{product.model}</span> : null}
            </div>

            <h1 className="mt-4 text-2xl leading-snug sm:text-3xl">{product.nameAr}</h1>
            {product.nameEn ? <p className="mt-1 text-sm text-slate-500" dir="ltr">{product.nameEn}</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StockBadge available={available} threshold={product.inventory?.lowStockThreshold ?? 3} />
              <Badge tone={product.hasBox ? "success" : "warning"}>
                {product.hasBox ? "بالكرتونة الأصلية" : "بدون كرتونة"}
              </Badge>
              <span className="text-xs text-slate-500" dir="ltr">SKU: {product.sku}</span>
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-ink-850/70 p-5">
              <Price value={product.price} compareAt={product.compareAtPrice} size="xl" />
              <p className="mt-1.5 text-xs text-slate-500">
                السعر شامل الضريبة. {product.warrantyMonths > 0 ? `ضمان ${product.warrantyMonths} شهرًا.` : "بدون ضمان."}
              </p>

              <div className="mt-5">
                <AddToCartForm productId={product.id} available={available} size="lg" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-accent" />
                  توصيل لكل المحافظات
                </span>
                <span className="flex items-center gap-1.5">
                  <Box className="h-3.5 w-3.5 text-accent" />
                  استلام من المحل
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                  قطع أصلية
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                  فحص قبل التسليم
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/builder" className={buttonClasses("outline", "md", "flex-1")}>
                <Wrench className="h-4 w-4" />
                افحص التوافق في منشئ التجميعات
              </Link>
              {settings.whatsapp ? (
                <a
                  href={`https://wa.me/${toWhatsAppNumber(settings.whatsapp)}?text=${encodeURIComponent(`استفسار عن ${product.nameAr} (${product.sku})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("ghost", "md")}
                >
                  <MessageCircle className="h-4 w-4" />
                  اسأل عن المنتج
                </a>
              ) : null}
            </div>

            {product.descriptionAr ? (
              <div className="prose-ar mt-7 border-t border-line pt-6">
                <h2 className="!mt-0 text-base">عن المنتج</h2>
                <p>{product.descriptionAr}</p>
              </div>
            ) : null}
          </div>
        </div>

        {product.specs.length > 0 ? (
          <Section className="pb-0">
            <SectionHeading
              eyebrow="البيانات التقنية"
              title="المواصفات الكاملة"
              description="المواصفات كما وردت من الشركة المصنعة. تُستخدم هذه القيم أيضًا في فحص توافق التجميعة."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[...groups.entries()].map(([group, specs]) => (
                <div key={group} className="surface overflow-hidden">
                  <h3 className="flex items-center gap-2 border-b border-line bg-ink-800/60 px-4 py-3 text-sm text-white">
                    <Cpu className="h-4 w-4 text-accent" />
                    {group}
                  </h3>
                  <dl className="divide-y divide-line/70">
                    {specs.map((spec) => (
                      <div key={spec.id} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                        <dt className="text-slate-400">{spec.label}</dt>
                        <dd className="text-left font-semibold text-slate-200" dir="auto">
                          {spec.value}
                          {spec.unit ? <span className="mr-1 text-xs text-slate-500">{spec.unit}</span> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface p-5">
              <ShoppingCart className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm">الدفع والاستلام</h3>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                دفع نقدًا عند الاستلام أو من المحل{settings.instapayEnabled ? "، أو تحويل إنستاباي بمراجعة يدوية" : ""}.
              </p>
            </div>
            <div className="surface p-5">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm">ضمان مكتوب</h3>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                {product.warrantyMonths > 0
                  ? `هذا المنتج بضمان ${product.warrantyMonths} شهرًا وفق سياسة الضمان.`
                  : "راجع سياسة الضمان لمعرفة تفاصيل المنتجات التي لا تشملها."}
              </p>
            </div>
            <div className="surface p-5">
              <Cpu className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm">تحقق من التوافق</h3>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                استخدم منشئ التجميعات لفحص المقبس، الرامات، أبعاد الكارت وقدرة مزود الطاقة قبل الشراء.
              </p>
            </div>
          </div>
        </Section>

        {related.length > 0 ? (
          <Section className="pt-0">
            <SectionHeading
              eyebrow="قد يعجبك أيضًا"
              title="منتجات مشابهة"
              href={`/category/${product.category.slug}`}
              linkLabel="كل التصنيف"
            />
            <ProductGrid products={related} />
          </Section>
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-line bg-ink-850/60 p-4 text-xs text-slate-400">
          <Link href={`/category/${product.category.slug}`} className="inline-flex items-center gap-1 font-bold text-accent hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            العودة إلى {product.category.nameAr}
          </Link>
          <span>السعر المعروض: {formatPrice(product.price)}</span>
        </div>
      </div>
    </>
  );
}

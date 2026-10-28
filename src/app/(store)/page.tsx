import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Gamepad2,
  MapPin,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { getBestSellers, getCategories, getLatestProducts, getOfferProducts, getPrebuiltPcs, getStoreStats } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { ProductGrid } from "@/components/product/product-card";
import { PrebuiltCard } from "@/components/product/prebuilt-card";
import { CategoryCard } from "@/components/product/category-card";
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonClasses } from "@/components/ui/button";
import { TrustStrip } from "@/components/layout/header";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/product/price";
import { formatNumber, absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "متجر خالد للكمبيوتر | قطع PC وتجميعات احترافية في القاهرة",
  description:
    "تسوق معالجات، كروت شاشة، رامات، لوحات أم وتجميعات PC جاهزة، أو كوّن تجميعتك مع فحص التوافق. مول البستان، وسط البلد، القاهرة.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, latest, best, prebuilt, offers, stats, settings] = await Promise.all([
    getCategories(),
    getLatestProducts(8),
    getBestSellers(4),
    getPrebuiltPcs(3),
    getOfferProducts(4),
    getStoreStats(),
    getSettings(),
  ]);

  const heroProduct = best[0] ?? latest[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.storeNameAr,
    alternateName: settings.storeNameEn,
    url: absoluteUrl("/"),
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.addressLine,
      addressLocality: "القاهرة",
      addressCountry: "EG",
    },
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    image: absoluteUrl("/images/placeholder-1.png"),
    priceRange: "EGP",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 -z-10 bg-grid-fade bg-grid opacity-70" />
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-accent/[0.06] to-transparent" />
        <div className="container-x grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div className="animate-fade-up">
            <div className="chip mb-5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              مول البستان · وسط البلد · القاهرة
            </div>
            <h1 className="text-balance text-4xl leading-[1.25] sm:text-5xl lg:text-6xl">
              ابنِ جهازك…
              <br />
              <span className="text-accent">بأداء يستحقك.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-slate-400 sm:text-base">
              قطع كمبيوتر أصلية، تجميعات جاهزة، ومنشئ تجميعات يفحص توافق كل قطعة قبل الشراء.
              اختر بثقة، واستلم من المحل أو نوصّلك لباب البيت.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shop" className={buttonClasses("primary", "lg")}>
                تسوق القطع
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link href="/builder" className={buttonClasses("outline", "lg")}>
                <Wrench className="h-4 w-4" />
                كوّن تجميعتك
              </Link>
            </div>

            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                { value: formatNumber(stats.products), label: "منتج متاح" },
                { value: `${settings.defaultWarrantyMonths}+`, label: "شهر ضمان" },
                { value: "100%", label: "قطع أصلية" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line bg-ink-850/70 px-3 py-3 text-center">
                  <p className="text-xl font-extrabold text-white">{item.value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up lg:pr-6">
            <div className="absolute -inset-8 -z-10 rounded-full bg-accent/10 blur-3xl" />
            {heroProduct ? (
              <div className="surface glow-ring overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Sparkles className="h-4 w-4 text-accent" />
                    مختار لك هذا الأسبوع
                  </div>
                  <span className="chip">متوفر</span>
                </div>
                <Link href={`/product/${heroProduct.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-ink-900">
                  <ProductImage
                    src={heroProduct.images[0]?.url}
                    alt={heroProduct.nameAr}
                    categorySlug={heroProduct.category.slug}
                    priority
                    sizes="(max-width: 1024px) 100vw, 480px"
                    className="transition duration-500 hover:scale-[1.03]"
                  />
                </Link>
                <div className="p-4 sm:p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {heroProduct.brand?.name ?? heroProduct.category.nameAr}
                  </p>
                  <Link href={`/product/${heroProduct.slug}`} className="mt-1 block text-lg font-bold text-white transition hover:text-accent">
                    {heroProduct.nameAr}
                  </Link>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <Price value={heroProduct.price} compareAt={heroProduct.compareAtPrice} size="lg" />
                    <Link href={`/product/${heroProduct.slug}`} className={buttonClasses("secondary", "sm")}>
                      التفاصيل
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="surface flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
                <Cpu className="h-10 w-10 text-accent" />
                <p className="font-bold text-white">المتجر جاهز لاستقبال أول منتج</p>
                <p className="text-xs text-slate-400">أضف منتجاتك من لوحة التحكم لتظهر هنا.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container-x pt-8">
        <TrustStrip />
      </div>

      {/* Categories */}
      <Section className="pb-4">
        <div className="container-x">
          <SectionHeading
            eyebrow="تسوق حسب الفئة"
            title="كل مكوّنات الجهاز في مكان واحد"
            description="من المعالج حتى الكيسة والملحقات — اختر الفئة وابدأ البناء."
            href="/shop"
          />
          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 12).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </Section>

      {/* Latest */}
      <Section className="pt-8">
        <div className="container-x">
          <SectionHeading
            eyebrow="وصل حديثًا"
            title="أحدث المنتجات"
            href="/shop?sort=newest"
            linkLabel="كل الجديد"
          />
          {latest.length > 0 ? (
            <ProductGrid products={latest} />
          ) : (
            <div className="surface px-6 py-12 text-center text-sm text-slate-400">
              لا توجد منتجات منشورة بعد. أضف أول منتج من لوحة التحكم.
            </div>
          )}
        </div>
      </Section>

      {/* Builder CTA */}
      <Section className="py-8">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-l from-accent/[0.09] via-ink-850 to-ink-850 p-6 sm:p-10">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <div className="chip mb-4">
                  <Wrench className="h-3.5 w-3.5 text-accent" />
                  منشئ التجميعات
                </div>
                <h2 className="text-2xl sm:text-3xl">كوّن تجميعتك… وسيخبرك النظام إن كانت متوافقة</h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-slate-400">
                  اختر المعالج واللوحة والرامات وكارت الشاشة والباور والكيسة، وسيحسب النظام السعر فورًا
                  ويفحص المقبس، نوع الرامات، أبعاد الكارت، قدرة الباور والموصلات. وإذا نقصت بيانات قطعة
                  سيخبرك بوضوح بدلًا من ادعاء التوافق.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/builder" className={buttonClasses("primary", "md")}>
                    ابدأ التجميع
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link href="/prebuilt" className={buttonClasses("outline", "md")}>
                    شاهد التجميعات الجاهزة
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: MousePointerClick, step: "01", title: "اختر القطع", text: "من مخزون حقيقي وأسعار محدّثة" },
                  { icon: Cpu, step: "02", title: "افحص التوافق", text: "قواعد فنية قابلة للاختبار" },
                  { icon: CheckCircle2, step: "03", title: "أضف للسلة", text: "تجميعة كاملة بضغطة واحدة" },
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-line bg-ink-900/70 p-4">
                    <item.icon className="h-5 w-5 text-accent" />
                    <p className="mt-3 text-[10px] font-black tracking-widest text-slate-500">{item.step}</p>
                    <p className="mt-1 text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Best sellers */}
      {best.length > 0 ? (
        <Section>
          <div className="container-x">
            <SectionHeading eyebrow="اختيارات العملاء" title="الأكثر مبيعًا" href="/shop?sort=best" linkLabel="كل الأكثر مبيعًا" />
            <ProductGrid products={best} />
          </div>
        </Section>
      ) : null}

      {/* Prebuilt */}
      {prebuilt.length > 0 ? (
        <Section>
          <div className="container-x">
            <SectionHeading
              eyebrow="جاهز للعب"
              title="تجميعات كمبيوتر جاهزة"
              description="اختبرناها ونسّقناها لك — شغّلها فور الاستلام."
              href="/prebuilt"
            />
            <div className="grid gap-4 md:grid-cols-3">
              {prebuilt.map((product) => (
                <PrebuiltCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* Offers */}
      {offers.length > 0 ? (
        <Section>
          <div className="container-x">
            <SectionHeading eyebrow="لفترة محدودة" title="عروض وخصومات" href="/shop?sort=newest" />
            <ProductGrid products={offers} />
          </div>
        </Section>
      ) : null}

      {/* Support / policies */}
      <Section>
        <div className="container-x grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "ضمان واضح ومكتوب",
              text: `جميع القطع أصلية وبضمان يصل إلى ${settings.defaultWarrantyMonths} شهرًا حسب المنتج. تفاصيل الضمان تظهر في صفحة كل منتج.`,
              href: "/policies/warranty",
              link: "اقرأ سياسة الضمان",
            },
            {
              icon: Gamepad2,
              title: "خدمة تجميع واحترافية",
              text: "فريقنا يساعدك في اختيار القطع المتوافقة، ويمكنك تجربة التجميعة في المحل قبل الاستلام.",
              href: "/contact",
              link: "تواصل مع الفريق",
            },
            {
              icon: MapPin,
              title: "استلام من قلب القاهرة",
              text: `استلم طلبك من ${settings.addressLine}. متاح الدفع نقدًا عند الاستلام من المحل.`,
              href: "/policies/shipping",
              link: "تفاصيل الشحن والاستلام",
            },
          ].map((item) => (
            <div key={item.title} className="surface flex flex-col p-6">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-slate-400">{item.text}</p>
              <Link href={item.href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
                {item.link}
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

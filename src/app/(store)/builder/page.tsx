import type { Metadata } from "next";
import { Cpu, ShieldCheck, Wrench, Zap } from "lucide-react";
import { getBuilderCatalog } from "@/server/catalog";
import {
  getCompatibilityOverrides,
  toBuilderProduct,
  type BuilderProduct,
} from "@/server/builds";
import { SLOT_CATEGORY_SLUGS } from "@/lib/constants";
import { getSettings } from "@/server/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PcBuilder } from "@/components/builder/pc-builder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "كوّن تجميعتك — فحص توافق تلقائي",
  description:
    "اختر المعالج واللوحة الأم والرامات وكارت الشاشة ومزود الطاقة، وشاهد السعر الإجمالي وفحص التوافق الفني مباشرة.",
  alternates: { canonical: "/builder" },
};

export default async function BuilderPage() {
  const [products, overrides, settings] = await Promise.all([
    getBuilderCatalog(Object.values(SLOT_CATEGORY_SLUGS)),
    getCompatibilityOverrides(),
    getSettings(),
  ]);

  const items: BuilderProduct[] = products.map((product) =>
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
    }),
  );

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "منشئ التجميعات" }]} />

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">منشئ التجميعات</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">ابنِ جهازك خطوة بخطوة</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            اختر القطع من مخزون المتجر الفعلي. يحسب النظام الإجمالي فورًا ويفحص التوافق الفني بنفس منطق أدوات التجميع
            العالمية، ويوضح القطع المتاحة والبدائل المقترحة لأي قطعة غير متوفرة مع إعادة فحص التوافق. يمكنك حفظ
            اختياراتك في متصفحك
            {settings.whatsapp ? " أو إرسال التجميعة كاملة إلى المتجر عبر واتساب." : "."} لا يتم أبدًا اعتماد السعر
            المعروض على العميل عند إتمام الطلب.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Cpu, title: "قطع حقيقية", text: "من المخزون" },
            { icon: ShieldCheck, title: "فحص توافق", text: "قواعد فنية" },
            { icon: Zap, title: "سعر فوري", text: "تحديث مباشر" },
          ].map((item) => (
            <div key={item.title} className="surface p-3 text-center">
              <item.icon className="mx-auto h-4 w-4 text-accent" />
              <p className="mt-2 text-[11px] font-bold text-white">{item.title}</p>
              <p className="mt-0.5 text-[9px] text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <PcBuilder
          products={items}
          overrides={overrides}
          whatsapp={settings.whatsapp}
          storeName={settings.storeNameAr}
        />
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-line bg-ink-850/60 p-4 text-[11px] leading-6 text-slate-400">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          التجميعة المقترحة تعتمد على بيانات الشركات المصنعة. قد تحتاج بعض المعالجات إلى تحديث BIOS، وبعض الكروت
          إلى كابل 12VHPWR. فريق المحل يراجع كل تجميعة قبل التسليم، ويمكنك دائمًا{" "}
          <a href="/contact" className="font-bold text-accent hover:underline">
            التواصل معنا
          </a>{" "}
          لتأكيد التفاصيل.
        </p>
      </div>
    </div>
  );
}

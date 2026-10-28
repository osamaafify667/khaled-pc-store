import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Wrench } from "lucide-react";
import { getPrebuiltPcs } from "@/server/catalog";
import { PrebuiltCard } from "@/components/product/prebuilt-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تجميعات كمبيوتر جاهزة",
  description: "تجميعات PC جاهزة ومختبرة للألعاب والتصميم، بضمان وخدمة من متجر خالد للكمبيوتر في وسط البلد.",
  alternates: { canonical: "/prebuilt" },
};

export default async function PrebuiltPage() {
  const products = await getPrebuiltPcs(30);

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "تجميعات جاهزة" }]} />

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">جاهز للاستخدام</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">تجميعات كمبيوتر جاهزة</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            اخترنا القطع، جمّعناها، واختبرناها. كل تجميعة تأتي جاهزة للاستخدام مع نظام تشغيل اختياري وضمان على
            المكونات. وإذا أردت تخصيص أي قطعة، تواصل معنا أو استخدم منشئ التجميعات.
          </p>
        </div>
        <div className="surface space-y-2 p-4 text-xs text-slate-400">
          {["مجمّعة ومختبرة قبل التسليم", "قطع أصلية بضمان", "إمكانية تعديل المواصفات"].map((item) => (
            <p key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              {item}
            </p>
          ))}
          <Link href="/builder" className={buttonClasses("outline", "sm", "mt-2 w-full")}>
            <Wrench className="h-4 w-4" />
            ابنِ تجميعتك بنفسك
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <PrebuiltCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="لا توجد تجميعات جاهزة منشورة بعد"
            description="يمكنك بناء تجميعة مخصصة الآن باستخدام منشئ التجميعات، أو التواصل معنا لطلب تجميعة."
            action={
              <Link href="/builder" className={buttonClasses("primary", "md")}>
                ابدأ التجميع
                <ArrowLeft className="h-4 w-4" />
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

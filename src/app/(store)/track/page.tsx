import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { TrackOrderForm } from "@/components/order/track-order-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تتبع الطلب",
  description: "تابع حالة طلبك من متجر خالد للكمبيوتر برقم الطلب ورقم الهاتف.",
};

type PageProps = { searchParams: Promise<{ order?: string }> };

export default async function TrackPage({ searchParams }: PageProps) {
  const { order } = await searchParams;

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "تتبع الطلب" }]} />

      <div className="mt-5 max-w-2xl">
        <div className="chip mb-4">
          <PackageSearch className="h-3.5 w-3.5 text-accent" />
          متابعة الطلب
        </div>
        <h1 className="text-3xl">تتبع طلبك</h1>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          أدخل رقم الطلب الذي ظهر لك بعد الشراء ورقم الهاتف نفسه. لا نعرض بيانات الطلب لأي شخص آخر.
        </p>
      </div>

      <div className="mt-8">
        <TrackOrderForm defaultOrderNumber={order ?? ""} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
        <span>يمكنك تتبع الطلب في أي وقت برقم الطلب ورقم الهاتف المستخدم عند الشراء.</span>
        <span>
          تحتاج مساعدة؟{" "}
          <Link href="/contact" className="font-bold text-accent hover:underline">
            تواصل معنا
          </Link>
        </span>
      </div>
    </div>
  );
}

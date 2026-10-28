import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getCart } from "@/server/cart";
import { getSettings } from "@/server/settings";
import { prisma } from "@/server/db";
import { validateCoupon } from "@/server/pricing";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const [settings, zones] = await Promise.all([
    getSettings(),
    prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { governorate: true, fee: true, codAvailable: true, estimatedDays: true },
    }),
  ]);

  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  let discount = 0;
  if (cart.couponCode) {
    try {
      discount = (await validateCoupon({ code: cart.couponCode, subtotal })).discount;
    } catch {
      discount = 0;
    }
  }

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "السلة", href: "/cart" }, { label: "إتمام الطلب" }]} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">إتمام الطلب</h1>
          <p className="mt-1 text-sm text-slate-400">
            أدخل بياناتك وسنتواصل معك لتأكيد التفاصيل. الدفع عند الاستلام متاح، وإنستاباي عند تفعيله.
          </p>
        </div>
        <Link href="/cart" className="link-muted inline-flex items-center gap-1.5 font-semibold">
          <ArrowLeft className="h-4 w-4" />
          تعديل السلة
        </Link>
      </div>

      <div className="mt-6">
        <CheckoutForm
          zones={zones.map((zone) => ({
            governorate: zone.governorate,
            fee: Number(zone.fee),
            codAvailable: zone.codAvailable,
            estimatedDays: zone.estimatedDays,
          }))}
          settings={{
            codEnabled: settings.codEnabled,
            pickupEnabled: settings.pickupEnabled,
            instapayEnabled: settings.instapayEnabled,
            instapayHandle: settings.instapayHandle,
            instapayName: settings.instapayName,
            shippingFlatFee: settings.shippingFlatFee,
            freeShippingThreshold: settings.freeShippingThreshold,
            addressLine: settings.addressLine,
            workingHours: settings.workingHours,
          }}
          subtotal={subtotal}
          discount={discount}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          لا نحتفظ ببيانات بطاقات؛ الدفع نقدًا أو تحويل يدوي.
        </span>
        <span>· بياناتك تُستخدم لتنفيذ الطلب فقط.</span>
        <Link href="/policies/privacy" className="text-accent hover:underline">
          سياسة الخصوصية
        </Link>
      </div>
    </div>
  );
}

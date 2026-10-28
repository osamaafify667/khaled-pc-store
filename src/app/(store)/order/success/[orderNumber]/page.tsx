import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Copy, MapPin, Printer, ShieldCheck, Truck } from "lucide-react";
import { getOrderByAccess } from "@/server/orders";
import { getSettings } from "@/server/settings";
import {
  FULFILLMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { OrderTimeline } from "@/components/order/order-timeline";
import { PaymentProofForm } from "@/components/order/payment-proof-form";
import { formatDateTimeShort, formatPrice } from "@/lib/utils";
import { toWhatsAppNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تم استلام طلبك",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function OrderSuccessPage({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const { token } = await searchParams;

  const order = token ? await getOrderByAccess(orderNumber, token) : null;
  if (!order) notFound();

  const settings = await getSettings();
  const accessToken = token ?? order.accessToken;
  const isInstapay = order.paymentMethod === "INSTAPAY";
  const pickup = order.fulfillmentType === "PICKUP";

  return (
    <div className="container-x py-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-3xl">تم استلام طلبك بنجاح</h1>
          <p className="mt-2 text-sm text-slate-400">
            شكرًا لثقتك في {settings.storeNameAr}. احتفظ برقم الطلب لمتابعة الحالة.
          </p>
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-line bg-ink-850 px-4 py-2">
            <span className="text-xs text-slate-500">رقم الطلب</span>
            <span className="font-mono text-sm font-bold text-white" dir="ltr">
              {order.orderNumber}
            </span>
            <Badge tone="success">تم الإنشاء</Badge>
          </div>
        </div>

        <div className="surface mt-8 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base">حالة الطلب</h2>
            <span className="text-[11px] text-slate-500">{formatDateTimeShort(order.placedAt)}</span>
          </div>
          <div className="mt-5">
            <OrderTimeline
              status={order.status}
              cancelledAt={order.cancelledAt}
              dates={{
                PENDING: order.placedAt,
                CONFIRMED: order.confirmedAt,
                SHIPPED: order.shippedAt,
                DELIVERED: order.deliveredAt,
              }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface p-5">
            <h2 className="text-base">تفاصيل الطلب</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    {item.productSlug ? (
                      <Link href={`/product/${item.productSlug}`} className="line-clamp-2 font-semibold text-slate-200 hover:text-accent">
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 font-semibold text-slate-200">{item.productName}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-500" dir="ltr">
                      {item.productSku} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-white">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>المجموع الفرعي</span>
                <span className="text-slate-200">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>الشحن</span>
                <span className="text-slate-200">{Number(order.shippingFee) === 0 ? "مجاني" : formatPrice(order.shippingFee)}</span>
              </div>
              {Number(order.discount) > 0 ? (
                <div className="flex justify-between text-emerald-300">
                  <span>الخصم {order.couponCode ? `(${order.couponCode})` : ""}</span>
                  <span>− {formatPrice(order.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <span className="font-bold text-white">الإجمالي</span>
                <span className="font-extrabold text-white">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface p-5">
              <h2 className="text-base">{pickup ? "الاستلام من المحل" : "التوصيل"}</h2>
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-300">
                {pickup ? <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> : <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
                <div className="leading-7">
                  {pickup ? (
                    <>
                      <p>{settings.addressLine}</p>
                      {order.pickupCode ? (
                        <p className="mt-2 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-xs">
                          كود الاستلام: <span className="font-mono text-base font-extrabold text-accent">{order.pickupCode}</span>
                        </p>
                      ) : null}
                      {settings.workingHours ? <p className="mt-1 text-xs text-slate-500">{settings.workingHours}</p> : null}
                    </>
                  ) : (
                    <>
                      <p>{order.customerName}</p>
                      <p>{order.customerPhone}</p>
                      <p>
                        {[order.shippingStreet, order.shippingBuilding, order.shippingArea, order.shippingCity, order.shippingGovernorate]
                          .filter(Boolean)
                          .join("، ")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="surface p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</h2>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${PAYMENT_STATUS_STYLES[order.paymentStatus]}`}>
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </span>
              </div>

              {isInstapay ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs leading-6 text-slate-400">
                    حوّل مبلغ <span className="font-bold text-white">{formatPrice(order.total)}</span> إلى حساب إنستاباي الخاص بالمتجر،
                    ثم أرسل مرجع التحويل بالأسفل. لا يعتبر الطلب مدفوعًا قبل مراجعة الإدارة.
                  </p>
                  {settings.instapayHandle ? (
                    <div className="rounded-lg border border-line bg-ink-900/60 px-3 py-2 text-xs">
                      <span className="text-slate-500">حساب إنستاباي: </span>
                      <span className="font-mono font-bold text-white" dir="ltr">{settings.instapayHandle}</span>
                      {settings.instapayName ? <span className="mr-2 text-slate-400">— {settings.instapayName}</span> : null}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
                      لم تُضبط بيانات إنستاباي بعد. تواصل مع المتجر لمعرفة بيانات التحويل.
                    </p>
                  )}
                  {settings.instapayInstructions ? (
                    <p className="whitespace-pre-line text-[11px] leading-6 text-slate-400">{settings.instapayInstructions}</p>
                  ) : null}
                  <PaymentProofForm
                    orderNumber={order.orderNumber}
                    accessToken={accessToken}
                    reference={order.payment?.reference ?? null}
                    status={order.paymentStatus}
                  />
                </div>
              ) : (
                <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {order.paymentMethod === "CASH_ON_DELIVERY"
                    ? "ادفع نقدًا للمندوب عند استلام الطلب. لا تدفع أي مبلغ قبل استلام القطع ومراجعتها."
                    : "ادفع نقدًا عند استلام الطلب من المحل. سيُطلب منك كود الاستلام."}
                </p>
              )}
            </div>
          </div>
        </div>

        {order.notes ? (
          <div className="mt-5 rounded-xl border border-line bg-ink-850/60 p-4 text-xs leading-6 text-slate-400">
            <span className="font-bold text-slate-200">ملاحظاتك: </span>
            {order.notes}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            احفظ رابط هذه الصفحة لمتابعة الطلب
          </span>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/track?order=${order.orderNumber}`} className={buttonClasses("primary", "md")}>
            تتبع الطلب
          </Link>
          <Link href="/shop" className={buttonClasses("outline", "md")}>
            متابعة التسوق
          </Link>
          {settings.whatsapp ? (
            <a
              href={`https://wa.me/${toWhatsAppNumber(settings.whatsapp)}?text=${encodeURIComponent(`استفسار عن الطلب ${order.orderNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("ghost", "md")}
            >
              تواصل بخصوص الطلب
            </a>
          ) : null}
          <span className="inline-flex items-center gap-1.5 px-2 text-slate-500">
            <Printer className="h-4 w-4" />
            يمكنك طباعة الصفحة من المتصفح
          </span>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-600">
          {FULFILLMENT_LABELS[order.fulfillmentType]} · {PAYMENT_METHOD_LABELS[order.paymentMethod]}
        </p>
      </div>
    </div>
  );
}

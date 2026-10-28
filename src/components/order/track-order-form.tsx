"use client";

import { useActionState } from "react";
import { Loader2, PackageSearch, Search } from "lucide-react";
import { trackOrderAction, type TrackState } from "@/actions/checkout";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input, Label } from "@/components/ui/field";
import { OrderTimeline } from "@/components/order/order-timeline";
import { formatDate, formatPrice, cn } from "@/lib/utils";

export function TrackOrderForm({ defaultOrderNumber = "" }: { defaultOrderNumber?: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrderAction, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form action={action} className="surface h-fit p-5">
        <h2 className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4 text-accent" />
          ابحث عن طلبك
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-400">
          أدخل رقم الطلب ورقم الهاتف المستخدم في الطلب. كلاهما مطلوب لحماية بياناتك.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="orderNumber">رقم الطلب</Label>
            <Input
              id="orderNumber"
              name="orderNumber"
              defaultValue={defaultOrderNumber}
              required
              dir="ltr"
              placeholder="KPS-260101-ABC123"
            />
          </div>
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input id="phone" name="phone" required inputMode="tel" dir="ltr" placeholder="01012345678" />
          </div>
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />}
          {pending ? "جارٍ البحث…" : "عرض حالة الطلب"}
        </Button>
      </form>

      <div>
        {state.error ? <Alert tone="error" title="تعذر العثور على الطلب">{state.error}</Alert> : null}

        {!state.order && !state.error ? (
          <div className="surface flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
            <PackageSearch className="h-10 w-10 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">أدخل بيانات الطلب لعرض حالته</p>
            <p className="max-w-sm text-xs leading-6 text-slate-500">
              ستظهر هنا حالة الطلب، حالة الدفع، وبيانات الشحن أو كود الاستلام من المحل.
            </p>
          </div>
        ) : null}

        {state.order ? (
          <div className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-500">رقم الطلب</p>
                <p className="font-mono text-sm font-bold text-white" dir="ltr">{state.order.orderNumber}</p>
                <p className="mt-1 text-[11px] text-slate-500">{formatDate(state.order.placedAt, true)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", ORDER_STATUS_STYLES[state.order.status])}>
                  {ORDER_STATUS_LABELS[state.order.status]}
                </span>
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", PAYMENT_STATUS_STYLES[state.order.paymentStatus])}>
                  {PAYMENT_STATUS_LABELS[state.order.paymentStatus]}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <OrderTimeline status={state.order.status} dates={{ PENDING: new Date(state.order.placedAt) }} />
            </div>

            {state.order.trackingNumber ? (
              <div className="mt-4 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
                شحنة عبر {state.order.carrier || "شركة الشحن"} — رقم التتبع:{" "}
                <span dir="ltr" className="font-mono font-bold">{state.order.trackingNumber}</span>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-[10px] text-slate-500">طريقة الاستلام</p>
                <p className="mt-1 text-xs font-bold text-slate-200">{FULFILLMENT_LABELS[state.order.fulfillmentType]}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[10px] text-slate-500">طريقة الدفع</p>
                <p className="mt-1 text-xs font-bold text-slate-200">{PAYMENT_METHOD_LABELS[state.order.paymentMethod]}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-4">
              {state.order.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-slate-300">
                    {item.name} <span className="text-slate-500">× {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-bold text-white">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-sm">
                <span className="font-bold text-white">الإجمالي</span>
                <span className="font-extrabold text-white">{formatPrice(state.order.total)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getOrderById } from "@/server/orders";
import { getSettings } from "@/server/settings";
import { PrintButton } from "@/components/admin/print-button";
import { FULFILLMENT_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "فاتورة الطلب", robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ id: string }> };

export default async function InvoicePage({ params }: PageProps) {
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrderById(id), getSettings()]);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print-hide mb-4 flex items-center justify-between gap-3">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
          <ArrowRight className="h-3.5 w-3.5" />
          رجوع للطلب
        </Link>
        <PrintButton />
      </div>

      <div className="print-sheet rounded-2xl border border-line bg-white p-8 text-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-900">{settings.storeNameAr}</p>
            <p className="text-xs font-bold tracking-[0.2em] text-slate-500">{settings.storeNameEn}</p>
            <p className="mt-2 text-xs leading-6 text-slate-600">{settings.addressLine}</p>
            {settings.phone ? <p className="text-xs text-slate-600" dir="ltr">{settings.phone}</p> : null}
            {settings.email ? <p className="text-xs text-slate-600" dir="ltr">{settings.email}</p> : null}
          </div>
          <div className="text-left">
            <p className="text-lg font-black text-slate-900">فاتورة</p>
            <p className="mt-1 font-mono text-sm font-bold" dir="ltr">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(order.placedAt, true)}</p>
            <p className="mt-2 inline-block rounded border border-slate-300 px-2 py-0.5 text-[11px] font-bold">
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
          <div>
            <p className="mb-1 font-bold text-slate-500">العميل</p>
            <p className="font-bold text-slate-900">{order.customerName}</p>
            <p dir="ltr">{order.customerPhone}</p>
            {order.customerEmail ? <p dir="ltr">{order.customerEmail}</p> : null}
          </div>
          <div>
            <p className="mb-1 font-bold text-slate-500">{FULFILLMENT_LABELS[order.fulfillmentType]}</p>
            {order.fulfillmentType === "PICKUP" ? (
              <p>استلام من المحل</p>
            ) : (
              <p className="leading-6">
                {order.shippingStreet}
                {order.shippingBuilding ? `، مبنى ${order.shippingBuilding}` : ""}
                <br />
                {order.shippingArea ? `${order.shippingArea}، ` : ""}
                {order.shippingCity}، {order.shippingGovernorate}
              </p>
            )}
            <p className="mt-1">الدفع: {PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-100 text-right">
              <th className="px-2 py-2 font-bold">المنتج</th>
              <th className="px-2 py-2 font-bold">SKU</th>
              <th className="px-2 py-2 font-bold">السعر</th>
              <th className="px-2 py-2 font-bold">الكمية</th>
              <th className="px-2 py-2 font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="px-2 py-2">{item.productName}</td>
                <td className="px-2 py-2 font-mono text-[10px]" dir="ltr">{item.productSku}</td>
                <td className="px-2 py-2">{formatPrice(item.unitPrice)}</td>
                <td className="px-2 py-2">{item.quantity}</td>
                <td className="px-2 py-2 font-bold">{formatPrice(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <table className="w-full max-w-xs text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-600">المجموع الفرعي</td>
                <td className="py-1 text-left font-bold">{formatPrice(order.subtotal)}</td>
              </tr>
              {Number(order.discount) > 0 ? (
                <tr>
                  <td className="py-1 text-slate-600">الخصم{order.couponCode ? ` (${order.couponCode})` : ""}</td>
                  <td className="py-1 text-left font-bold">− {formatPrice(order.discount)}</td>
                </tr>
              ) : null}
              <tr>
                <td className="py-1 text-slate-600">الشحن</td>
                <td className="py-1 text-left font-bold">{formatPrice(order.shippingFee)}</td>
              </tr>
              <tr className="border-t border-slate-300">
                <td className="py-2 font-bold">الإجمالي</td>
                <td className="py-2 text-left text-base font-black">{formatPrice(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {order.trackingNumber ? (
          <p className="mt-4 text-xs text-slate-600">
            رقم التتبع: <span className="font-mono font-bold" dir="ltr">{order.trackingNumber}</span>
            {order.carrier ? ` — ${order.carrier}` : ""}
          </p>
        ) : null}

        {order.notes ? <p className="mt-3 text-[11px] text-slate-600">ملاحظات العميل: {order.notes}</p> : null}

        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-[10px] leading-5 text-slate-500">
          <p>شكرًا لتعاملكم مع {settings.storeNameAr}. هذه الفاتورة صادرة إلكترونيًا.</p>
          <p>الضمان وفق سياسة الضمان المعلنة على الموقع. احتفظ بالفاتورة للمطالبات.</p>
        </div>
      </div>
    </div>
  );
}

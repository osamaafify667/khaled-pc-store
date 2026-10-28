import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, MapPin, MessageCircle, Package, Printer, UserRound } from "lucide-react";
import { getOrderById } from "@/server/orders";
import { getSettings } from "@/server/settings";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/constants";
import { toWhatsAppNumber } from "@/lib/phone";
import { OrderStatusForm, PaymentReviewForm } from "@/components/admin/order-actions";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cn, formatDate, formatDateTimeShort, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "تفاصيل الطلب" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrderById(id), getSettings()]);
  if (!order) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
            <ArrowRight className="h-3.5 w-3.5" />
            كل الطلبات
          </Link>
          <h1 className="mt-2 font-mono text-xl font-extrabold text-white" dir="ltr">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">{formatDate(order.placedAt, true)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", ORDER_STATUS_STYLES[order.status])}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", PAYMENT_STATUS_STYLES[order.paymentStatus])}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
            <Badge tone="neutral">{FULFILLMENT_LABELS[order.fulfillmentType]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/${toWhatsAppNumber(order.customerPhone)}?text=${encodeURIComponent(
              `مرحبًا ${order.customerName}، بخصوص طلبك ${order.orderNumber} من ${settings.storeNameAr}.\nحالة الطلب الحالية: ${ORDER_STATUS_LABELS[order.status]}.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("success", "sm")}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            واتساب العميل
          </a>
          <Link href={`/admin/orders/${order.id}/invoice`} className={buttonClasses("outline", "sm")}>
            <Printer className="h-3.5 w-3.5" />
            الفاتورة
          </Link>
          {order.userId ? (
            <Link href={`/admin/customers?q=${encodeURIComponent(order.user?.email ?? "")}`} className={buttonClasses("ghost", "sm")}>
              <UserRound className="h-3.5 w-3.5" />
              حساب العميل
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Package className="h-4 w-4 text-accent" />
              بنود الطلب
            </h2>
            <div className="table-wrap mt-3">
              <table className="data-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>سعر الوحدة</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="text-xs font-bold text-slate-200">{item.productName}</p>
                        <p className="text-[10px] text-slate-500" dir="ltr">{item.productSku}</p>
                      </td>
                      <td className="text-xs text-slate-300">{formatPrice(item.unitPrice)}</td>
                      <td className="text-xs text-slate-300">{item.quantity}</td>
                      <td className="text-xs font-bold text-white">{formatPrice(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">المجموع الفرعي</dt>
                <dd className="font-semibold text-white">{formatPrice(order.subtotal)}</dd>
              </div>
              {Number(order.discount) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-slate-400">الخصم {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                  <dd className="font-semibold text-emerald-300">− {formatPrice(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-slate-400">الشحن</dt>
                <dd className="font-semibold text-white">{formatPrice(order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-bold text-white">الإجمالي</dt>
                <dd className="font-extrabold text-white">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="surface p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <UserRound className="h-4 w-4 text-accent" />
                العميل
              </h2>
              <div className="mt-3 space-y-1 text-xs leading-6 text-slate-400">
                <p className="font-bold text-slate-200">{order.customerName}</p>
                <p dir="ltr">{order.customerPhone}</p>
                {order.customerEmail ? <p dir="ltr">{order.customerEmail}</p> : null}
                {order.user ? (
                  <p className="pt-1 text-[10px] text-slate-500">حساب: {order.user.email}</p>
                ) : (
                  <p className="pt-1 text-[10px] text-slate-500">شراء بدون حساب</p>
                )}
              </div>
            </section>

            <section className="surface p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <MapPin className="h-4 w-4 text-accent" />
                {FULFILLMENT_LABELS[order.fulfillmentType]}
              </h2>
              {order.fulfillmentType === "PICKUP" ? (
                <div className="mt-3 space-y-1 text-xs leading-6 text-slate-400">
                  <p>استلام من المحل.</p>
                  {order.pickupCode ? <p>كود الاستلام: <span className="font-mono font-bold text-accent">{order.pickupCode}</span></p> : null}
                </div>
              ) : (
                <div className="mt-3 space-y-1 text-xs leading-6 text-slate-400">
                  <p>{order.shippingStreet}{order.shippingBuilding ? `، مبنى ${order.shippingBuilding}` : ""}</p>
                  <p>{order.shippingArea ? `${order.shippingArea}، ` : ""}{order.shippingCity}، {order.shippingGovernorate}</p>
                  {order.shippingNotes ? <p>ملاحظات: {order.shippingNotes}</p> : null}
                </div>
              )}
              {order.trackingNumber ? (
                <p className="mt-3 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-[11px] text-sky-200">
                  {order.carrier || "شحن"} · <span dir="ltr" className="font-mono font-bold">{order.trackingNumber}</span>
                </p>
              ) : null}
            </section>
          </div>

          <section className="surface p-5">
            <h2 className="text-sm font-bold text-white">سجل الطلب</h2>
            {order.auditLogs.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">لا توجد أحداث مسجلة.</p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {order.auditLogs.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-3 border-b border-line pb-2 text-[11px] last:border-0">
                    <div>
                      <p className="font-bold text-slate-200">{log.action}</p>
                      <p className="text-[10px] text-slate-500">{log.user?.name ?? "النظام"}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-500">{formatDateTimeShort(log.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {order.adminNotes ? (
            <section className="surface p-5">
              <h2 className="text-sm font-bold text-white">ملاحظات إدارية</h2>
              <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-400">{order.adminNotes}</p>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="text-sm font-bold text-white">إجراء الطلب</h2>
            <div className="mt-3">
              <OrderStatusForm orderId={order.id} status={order.status} />
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <FileText className="h-4 w-4 text-accent" />
              الدفع
            </h2>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <p>الطريقة: <span className="font-bold text-slate-200">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span></p>
              <p>الحالة: <span className="font-bold text-slate-200">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span></p>
              {order.payment?.reference ? (
                <p>المرجع: <span className="font-mono font-bold text-white" dir="ltr">{order.payment.reference}</span></p>
              ) : null}
              {order.payment?.proofUrl ? (
                <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex font-bold text-accent hover:underline">
                  عرض إثبات التحويل
                </a>
              ) : null}
              {order.payment?.rejectionReason ? (
                <p className="mt-1 text-rose-300">سبب الرفض: {order.payment.rejectionReason}</p>
              ) : null}
            </div>

            {order.paymentMethod === "INSTAPAY" && order.payment && order.paymentStatus !== "PAID" ? (
              <div className="mt-4 border-t border-line pt-4">
                <PaymentReviewForm paymentId={order.payment.id} status={order.paymentStatus} />
              </div>
            ) : null}
          </section>

          {order.notes ? (
            <section className="surface p-5">
              <h2 className="text-sm font-bold text-white">ملاحظات العميل</h2>
              <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-400">{order.notes}</p>
            </section>
          ) : null}

          <section className="surface p-5 text-[10px] text-slate-500">
            <p>معرف الطلب: <span className="font-mono" dir="ltr">{order.id}</span></p>
            <p className="mt-1">آخر تحديث: {formatDateTimeShort(order.updatedAt)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

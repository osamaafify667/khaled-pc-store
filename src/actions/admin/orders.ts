"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta, requireAdmin } from "@/server/auth";
import { reviewPayment, transitionOrder, OrderError, cancelOrder } from "@/server/orders";
import { InventoryError } from "@/server/inventory";
import { fieldErrors, orderTransitionSchema, paymentReviewSchema } from "@/lib/validation";

export type AdminOrderState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

function revalidateOrders(orderId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

export async function transitionOrderAction(_prev: AdminOrderState, formData: FormData): Promise<AdminOrderState> {
  const admin = await requireAdmin();
  const parsed = orderTransitionSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
    trackingNumber: formData.get("trackingNumber") || undefined,
    carrier: formData.get("carrier") || undefined,
    collectCash: formData.get("collectCash") || undefined,
    cancelReason: formData.get("cancelReason") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const meta = await getRequestMeta();
  try {
    await transitionOrder({
      orderId: parsed.data.orderId,
      actorId: admin.id,
      status: parsed.data.status,
      note: parsed.data.note,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      collectCash: Boolean(parsed.data.collectCash),
      cancelReason: parsed.data.cancelReason,
      ip: meta.ip,
    });
    revalidateOrders(parsed.data.orderId);
    revalidatePath("/shop");
    return { ok: true, message: "تم تحديث حالة الطلب" };
  } catch (error) {
    if (error instanceof OrderError || error instanceof InventoryError) return { error: error.message };
    console.error("transitionOrderAction", error);
    return { error: "تعذر تحديث الطلب" };
  }
}

export async function reviewPaymentAction(_prev: AdminOrderState, formData: FormData): Promise<AdminOrderState> {
  const admin = await requireAdmin();
  const parsed = paymentReviewSchema.safeParse({
    paymentId: formData.get("paymentId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const meta = await getRequestMeta();
  try {
    const order = await reviewPayment({
      paymentId: parsed.data.paymentId,
      actorId: admin.id,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
      ip: meta.ip,
    });
    revalidateOrders(order.id);
    return {
      ok: true,
      message:
        parsed.data.decision === "APPROVE"
          ? "تم تأكيد استلام التحويل. الطلب الآن مدفوع."
          : "تم رفض التحويل وتسجيل السبب.",
    };
  } catch (error) {
    return { error: error instanceof OrderError ? error.message : "تعذر مراجعة الدفع" };
  }
}

export async function quickCancelOrderAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId || !reason) return;
  await cancelOrder({ orderId, actorId: admin.id, reason });
  revalidateOrders(orderId);
}

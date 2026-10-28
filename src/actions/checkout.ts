"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCart } from "@/server/cart";
import { getRequestMeta } from "@/server/auth";
import { createOrderFromCart, OrderError } from "@/server/orders";
import { InventoryError } from "@/server/inventory";
import { PricingError } from "@/server/pricing";
import { checkoutSchema, fieldErrors } from "@/lib/validation";

export type CheckoutState = { error?: string; fieldErrors?: Record<string, string> };

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const raw = {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    fulfillmentType: formData.get("fulfillmentType"),
    paymentMethod: formData.get("paymentMethod"),
    governorate: formData.get("governorate") || undefined,
    city: formData.get("city") || undefined,
    area: formData.get("area") || undefined,
    street: formData.get("street") || undefined,
    building: formData.get("building") || undefined,
    addressNotes: formData.get("addressNotes") || undefined,
    notes: formData.get("notes") || undefined,
    acceptTerms: formData.get("acceptTerms"),
    saveAddress: formData.get("saveAddress") || undefined,
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message ?? "تحقق من البيانات" };
  }

  const data = parsed.data;
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { error: "سلة الشراء فارغة" };
  }

  const meta = await getRequestMeta();

  try {
    const order = await createOrderFromCart({
      userId: null,
      cartId: cart.id,
      customer: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || null,
      },
      fulfillmentType: data.fulfillmentType,
      paymentMethod: data.paymentMethod,
      address:
        data.fulfillmentType === "DELIVERY"
          ? {
              governorate: data.governorate!,
              city: data.city!,
              area: data.area,
              street: data.street!,
              building: data.building,
              notes: data.addressNotes,
              label: "عنوان التوصيل",
            }
          : null,
      saveAddress: false,
      notes: data.notes ?? null,
      ip: meta.ip,
    });

    revalidatePath("/", "layout");
    redirect(`/order/success/${order.orderNumber}?token=${order.accessToken}`);
  } catch (error) {
    if (error instanceof OrderError || error instanceof PricingError || error instanceof InventoryError) {
      return { error: error.message };
    }
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("placeOrderAction", error);
    return { error: "تعذر إنشاء الطلب. راجع البيانات وحاول مرة أخرى." };
  }
}

export type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: string;
  total: number;
  placedAt: string;
  trackingNumber: string | null;
  carrier: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
};

export type TrackState = { ok?: boolean; error?: string; order?: TrackedOrder };

export async function trackOrderAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const { trackingSchema } = await import("@/lib/validation");
  const { getOrderForTracking } = await import("@/server/orders");

  const parsed = trackingSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "بيانات غير صحيحة" };
  }
  const order = await getOrderForTracking(parsed.data.orderNumber, parsed.data.phone);
  if (!order) return { error: "لم نجد طلبًا بهذا الرقم ورقم الهاتف. تأكد من البيانات." };

  return {
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      fulfillmentType: order.fulfillmentType,
      total: Number(order.total),
      placedAt: order.placedAt.toISOString(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      items: order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    },
  };
}

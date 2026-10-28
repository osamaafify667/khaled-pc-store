"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addToCart,
  applyCoupon,
  CartError,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "@/server/cart";
import { cartAddSchema, cartUpdateSchema } from "@/lib/validation";

export type CartActionState = { ok?: boolean; message?: string; count?: number };

function revalidateCart() {
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function addToCartAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const parsed = cartAddSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "بيانات غير صحيحة" };

  try {
    const result = await addToCart(parsed.data.productId, parsed.data.quantity);
    revalidateCart();
    return { ok: true, message: "تمت إضافة المنتج إلى السلة", count: result.count };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof CartError ? error.message : "تعذر إضافة المنتج للسلة",
    };
  }
}

export async function updateCartItemAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const parsed = cartUpdateSchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { ok: false, message: "كمية غير صحيحة" };

  try {
    await updateCartItem(parsed.data.itemId, parsed.data.quantity);
    revalidateCart();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof CartError ? error.message : "تعذر تحديث الكمية" };
  }
}

export async function removeCartItemAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "العنصر غير موجود" };
  try {
    await removeCartItem(itemId);
    revalidateCart();
    return { ok: true, message: "تم حذف المنتج من السلة" };
  } catch {
    return { ok: false, message: "تعذر حذف المنتج" };
  }
}

const buildItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().min(1).max(10).default(1),
    }),
  )
  .min(1, "التجميعة فارغة")
  .max(20);

/** إضافة تجميعة كاملة إلى السلة — تُضاف القطع واحدة تلو الأخرى مع تقرير بأي فشل. */
export async function addBuildToCartAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, message: "بيانات التجميعة غير صحيحة" };
  }

  const parsed = buildItemsSchema.safeParse(parsedItems);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "بيانات التجميعة غير صحيحة" };
  }

  let added = 0;
  const failures: string[] = [];
  for (const item of parsed.data) {
    try {
      await addToCart(item.productId, item.quantity);
      added += 1;
    } catch (error) {
      failures.push(error instanceof CartError ? error.message : "تعذر إضافة إحدى القطع");
    }
  }

  revalidateCart();
  if (added === 0) {
    return { ok: false, message: failures[0] ?? "تعذر إضافة التجميعة للسلة" };
  }
  return {
    ok: true,
    message:
      failures.length > 0
        ? `تمت إضافة ${added} قطعة، وتعذر ${failures.length}: ${failures[0]}`
        : `تمت إضافة التجميعة كاملة (${added} قطعة) إلى السلة`,
  };
}

export async function applyCouponAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { ok: false, message: "أدخل كود الخصم" };
  try {
    const result = await applyCoupon(code);
    revalidateCart();
    return { ok: true, message: `تم تطبيق كود ${result.code}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "كود الخصم غير صحيح",
    };
  }
}

export async function removeCouponAction(): Promise<void> {
  await removeCoupon();
  revalidateCart();
}

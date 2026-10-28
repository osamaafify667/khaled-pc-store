import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CART_COOKIE } from "./auth";
import { MAX_CART_QUANTITY_PER_ITEM } from "@/lib/constants";
import { randomToken } from "@/lib/utils";
import { availableQuantity } from "./catalog";
import { validateCoupon } from "./pricing";

export class CartError extends Error {
  code: "NOT_FOUND" | "UNAVAILABLE" | "LIMIT" | "INVALID";
  constructor(code: CartError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
          inventory: true,
          brand: { select: { name: true } },
          category: { select: { slug: true, nameAr: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 60,
};

export async function getCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

export async function getCart(): Promise<CartWithItems | null> {
  const token = await getCartToken();
  if (!token) return null;
  return prisma.cart.findUnique({ where: { token }, include: cartInclude });
}

export async function ensureCart(): Promise<CartWithItems> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { token }, include: cartInclude });
    if (existing) return existing;
  }
  const newToken = randomToken(24);
  const cart = await prisma.cart.create({ data: { token: newToken }, include: cartInclude });
  store.set(CART_COOKIE, newToken, cookieOptions);
  return cart;
}

export async function attachCartToUser(userId: string): Promise<void> {
  const token = await getCartToken();
  if (!token) return;
  await prisma.cart.updateMany({ where: { token, userId: null }, data: { userId } });
}

export async function addToCart(productId: string, quantity: number): Promise<{ count: number }> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new CartError("INVALID", "كمية غير صحيحة");
  const quantityToAdd = Math.min(quantity, MAX_CART_QUANTITY_PER_ITEM);

  const product = await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE" },
    include: { inventory: true },
  });
  if (!product) throw new CartError("NOT_FOUND", "المنتج غير موجود أو غير متاح للبيع");

  const available = availableQuantity(product.inventory);
  if (available < 1) throw new CartError("UNAVAILABLE", "هذا المنتج غير متوفر حاليًا");

  const cart = await ensureCart();
  const existing = cart.items.find((item) => item.productId === productId);
  const nextQuantity = (existing?.quantity ?? 0) + quantityToAdd;

  if (nextQuantity > available) {
    throw new CartError("LIMIT", `الكمية المتاحة من هذا المنتج هي ${available} فقط`);
  }
  if (nextQuantity > MAX_CART_QUANTITY_PER_ITEM) {
    throw new CartError("LIMIT", `الحد الأقصى للطلب من المنتج الواحد هو ${MAX_CART_QUANTITY_PER_ITEM} قطع`);
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: nextQuantity },
    update: { quantity: nextQuantity },
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

  return { count: await getCartItemCount() };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new CartError("INVALID", "كمية غير صحيحة");
  const cart = await getCart();
  if (!cart) throw new CartError("NOT_FOUND", "سلة الشراء غير موجودة");
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) throw new CartError("NOT_FOUND", "العنصر غير موجود في السلة");

  const available = availableQuantity(item.product.inventory);
  if (quantity > available) throw new CartError("LIMIT", `الكمية المتاحة هي ${available} فقط`);
  if (quantity > MAX_CART_QUANTITY_PER_ITEM) {
    throw new CartError("LIMIT", `الحد الأقصى ${MAX_CART_QUANTITY_PER_ITEM} قطع من المنتج الواحد`);
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function removeCartItem(itemId: string): Promise<void> {
  const cart = await getCart();
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } });
}

export async function applyCoupon(code: string): Promise<{ discount: number; code: string }> {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) throw new CartError("INVALID", "أضف منتجات للسلة أولًا");
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const result = await validateCoupon({ code, subtotal });
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: result.coupon.code } });
  return { discount: result.discount, code: result.coupon.code };
}

export async function removeCoupon(): Promise<void> {
  const cart = await getCart();
  if (!cart) return;
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
}

export async function getCartItemCount(): Promise<number> {
  const token = await getCartToken();
  if (!token) return 0;
  const cart = await prisma.cart.findUnique({
    where: { token },
    select: { items: { select: { quantity: true } } },
  });
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartLines(cart: CartWithItems) {
  return cart.items.map((item) => ({
    productId: item.productId,
    name: item.product.nameAr,
    slug: item.product.slug,
    sku: item.product.sku,
    unitPrice: Number(item.product.price),
    quantity: item.quantity,
    available: availableQuantity(item.product.inventory),
    image: item.product.images[0]?.url ?? null,
  }));
}

export async function getCartSummary() {
  const cart = await getCart();
  if (!cart) return { cart: null, count: 0, subtotal: 0 };
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  return { cart, count, subtotal };
}

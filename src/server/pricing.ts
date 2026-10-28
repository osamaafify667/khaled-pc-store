import { prisma as defaultDb, type DbClient } from "./db";
import { getSettings, type Settings } from "./settings";

export class PricingError extends Error {
  code:
    | "CART_EMPTY"
    | "PRODUCT_UNAVAILABLE"
    | "INSUFFICIENT_STOCK"
    | "COUPON_INVALID"
    | "SHIPPING_UNAVAILABLE"
    | "PRICE_CHANGED"
    | "INVALID_TOTAL";
  constructor(code: PricingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface PricingLineInput {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  available: number;
  image?: string | null;
}

export interface QuoteLine extends PricingLineInput {
  lineTotal: number;
}

export interface AppliedCoupon {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
}

export interface OrderQuote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: AppliedCoupon | null;
  shippingZone: string | null;
  freeShippingApplied: boolean;
  fulfillmentType: "DELIVERY" | "PICKUP";
  governorate: string | null;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateSubtotal(lines: Array<{ unitPrice: number; quantity: number }>): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
}

export async function validateCoupon(input: {
  code: string;
  subtotal: number;
  db?: DbClient;
  now?: Date;
}): Promise<{ coupon: AppliedCoupon; discount: number; couponId: string }> {
  const db = input.db ?? defaultDb;
  const code = input.code.trim().toUpperCase();
  if (!code) throw new PricingError("COUPON_INVALID", "أدخل كود خصم صحيح");

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new PricingError("COUPON_INVALID", "كود الخصم غير صحيح أو غير مفعّل");
  }
  const now = input.now ?? new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new PricingError("COUPON_INVALID", "كود الخصم لم يبدأ بعد");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new PricingError("COUPON_INVALID", "انتهت صلاحية كود الخصم");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new PricingError("COUPON_INVALID", "تم استخدام كود الخصم بالكامل");
  }
  const minSubtotal = Number(coupon.minSubtotal);
  if (input.subtotal < minSubtotal) {
    throw new PricingError(
      "COUPON_INVALID",
      `كود الخصم يتطلب حدًا أدنى للطلب بقيمة ${minSubtotal} ج.م`,
    );
  }

  const value = Number(coupon.value);
  let discount = coupon.type === "PERCENT" ? (input.subtotal * value) / 100 : value;
  discount = roundMoney(Math.min(Math.max(discount, 0), input.subtotal));

  return {
    couponId: coupon.id,
    coupon: { code: coupon.code, type: coupon.type, value },
    discount,
  };
}

export interface ShippingResult {
  fee: number;
  zone: string | null;
  freeApplied: boolean;
}

export async function calculateShipping(input: {
  fulfillmentType: "DELIVERY" | "PICKUP";
  governorate?: string | null;
  subtotal: number;
  settings?: Settings;
  db?: DbClient;
}): Promise<ShippingResult> {
  if (input.fulfillmentType === "PICKUP") return { fee: 0, zone: null, freeApplied: false };

  const settings = input.settings ?? (await getSettings());
  if (settings.freeShippingThreshold !== null && settings.freeShippingThreshold > 0 && input.subtotal >= settings.freeShippingThreshold) {
    return { fee: 0, zone: input.governorate ?? null, freeApplied: true };
  }

  const db = input.db ?? defaultDb;
  let fee = settings.shippingFlatFee;
  let zone: string | null = input.governorate ?? null;
  if (input.governorate) {
    const shippingZone = await db.shippingZone.findFirst({
      where: { governorate: input.governorate, isActive: true },
    });
    if (shippingZone) {
      fee = Number(shippingZone.fee);
    } else {
      zone = null;
      if (!settings.shippingFlatFee) {
        throw new PricingError("SHIPPING_UNAVAILABLE", "لا توجد تكلفة شحن مُعدة لهذه المحافظة. تواصل معنا لتأكيد الشحن.");
      }
    }
  } else {
    throw new PricingError("SHIPPING_UNAVAILABLE", "اختر المحافظة لحساب تكلفة الشحن");
  }

  return { fee: roundMoney(Math.max(fee, 0)), zone, freeApplied: false };
}

export async function buildQuote(input: {
  lines: PricingLineInput[];
  couponCode?: string | null;
  fulfillmentType: "DELIVERY" | "PICKUP";
  governorate?: string | null;
  settings?: Settings;
  db?: DbClient;
  now?: Date;
}): Promise<OrderQuote> {
  if (input.lines.length === 0) throw new PricingError("CART_EMPTY", "سلة الشراء فارغة");

  const lines: QuoteLine[] = input.lines.map((line) => {
    if (line.available < 1) {
      throw new PricingError("PRODUCT_UNAVAILABLE", `«${line.name}» غير متوفر حاليًا`);
    }
    if (line.quantity > line.available) {
      throw new PricingError(
        "INSUFFICIENT_STOCK",
        `الكمية المتاحة من «${line.name}» هي ${line.available} فقط`,
      );
    }
    if (line.quantity < 1) throw new PricingError("INVALID_TOTAL", "كمية غير صحيحة");
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      throw new PricingError("PRICE_CHANGED", "سعر المنتج غير صحيح");
    }
    return { ...line, lineTotal: roundMoney(line.unitPrice * line.quantity) };
  });

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const settings = input.settings ?? (await getSettings());
  const shipping = await calculateShipping({
    fulfillmentType: input.fulfillmentType,
    governorate: input.governorate,
    subtotal,
    settings,
    db: input.db,
  });

  let discount = 0;
  let coupon: AppliedCoupon | null = null;
  if (input.couponCode) {
    const result = await validateCoupon({
      code: input.couponCode,
      subtotal,
      db: input.db,
      now: input.now,
    });
    discount = result.discount;
    coupon = result.coupon;
  }

  const total = roundMoney(subtotal - discount + shipping.fee);
  if (total < 0) throw new PricingError("INVALID_TOTAL", "إجمالي الطلب غير صحيح");

  return {
    lines,
    subtotal,
    discount,
    shippingFee: shipping.fee,
    total,
    coupon,
    shippingZone: shipping.zone,
    freeShippingApplied: shipping.freeApplied,
    fulfillmentType: input.fulfillmentType,
    governorate: input.governorate ?? null,
  };
}

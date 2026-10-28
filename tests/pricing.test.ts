import { beforeEach, describe, expect, it } from "vitest";
import {
  buildQuote,
  calculateShipping,
  calculateSubtotal,
  PricingError,
  roundMoney,
  validateCoupon,
  type PricingLineInput,
} from "@/server/pricing";
import { DEFAULT_SETTINGS, type Settings } from "@/server/settings";
import { createProduct, prisma, resetDatabase } from "./helpers/db";

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function line(overrides: Partial<PricingLineInput> = {}): PricingLineInput {
  return {
    productId: "product-1",
    name: "منتج اختبار",
    slug: "test-product",
    sku: "SKU-1",
    unitPrice: 1000,
    quantity: 1,
    available: 10,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDatabase();
});

describe("حسابات الأسعار", () => {
  it("يجمع البنود ويقرّب المبالغ إلى قرشين", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
    expect(calculateSubtotal([{ unitPrice: 19.99, quantity: 3 }])).toBe(59.97);
    expect(calculateSubtotal([{ unitPrice: 0.1, quantity: 1 }, { unitPrice: 0.2, quantity: 1 }])).toBe(0.3);
  });

  it("يرفض السلة الفارغة", async () => {
    await expect(
      buildQuote({ lines: [], fulfillmentType: "PICKUP", settings: settings() }),
    ).rejects.toMatchObject({ code: "CART_EMPTY" });
  });

  it("يرفض منتجًا غير متوفر أو كمية أكبر من المتاح", async () => {
    await expect(
      buildQuote({ lines: [line({ available: 0 })], fulfillmentType: "PICKUP", settings: settings() }),
    ).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });

    await expect(
      buildQuote({ lines: [line({ quantity: 3, available: 2 })], fulfillmentType: "PICKUP", settings: settings() }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  it("يرفض كمية أو سعرًا غير صحيح", async () => {
    await expect(
      buildQuote({ lines: [line({ quantity: 0 })], fulfillmentType: "PICKUP", settings: settings() }),
    ).rejects.toMatchObject({ code: "INVALID_TOTAL" });

    await expect(
      buildQuote({ lines: [line({ unitPrice: -5 })], fulfillmentType: "PICKUP", settings: settings() }),
    ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
  });

  it("يحسب الإجمالي على السيرفر ولا يثق بأي إجمالي قادم من العميل", async () => {
    const quote = await buildQuote({
      lines: [line({ unitPrice: 1250.5, quantity: 2 }), line({ productId: "p2", unitPrice: 300, quantity: 1 })],
      fulfillmentType: "PICKUP",
      settings: settings(),
    });

    expect(quote.subtotal).toBe(2801);
    expect(quote.shippingFee).toBe(0);
    expect(quote.discount).toBe(0);
    expect(quote.total).toBe(2801);
  });
});

describe("الشحن", () => {
  beforeEach(async () => {
    await prisma.shippingZone.create({
      data: { governorate: "القاهرة", fee: 50, codAvailable: true },
    });
    await prisma.shippingZone.create({
      data: { governorate: "الإسكندرية", fee: 75, codAvailable: false },
    });
  });

  it("يستخدم سعر الشحن الخاص بالمحافظة", async () => {
    const result = await calculateShipping({
      fulfillmentType: "DELIVERY",
      governorate: "الإسكندرية",
      subtotal: 1000,
      settings: settings(),
    });
    expect(result).toEqual({ fee: 75, zone: "الإسكندرية", freeApplied: false });
  });

  it("يجعل الشحن مجانيًا عند تجاوز حد الشحن المجاني", async () => {
    const result = await calculateShipping({
      fulfillmentType: "DELIVERY",
      governorate: "القاهرة",
      subtotal: 2000,
      settings: settings({ freeShippingThreshold: 1500 }),
    });
    expect(result).toEqual({ fee: 0, zone: "القاهرة", freeApplied: true });
  });

  it("لا يحسب شحنًا للاستلام من المحل", async () => {
    const result = await calculateShipping({
      fulfillmentType: "PICKUP",
      subtotal: 100,
      settings: settings({ shippingFlatFee: 99 }),
    });
    expect(result.fee).toBe(0);
  });

  it("يستخدم رسمًا ثابتًا للمحافظة غير المدرجة إن وُجد", async () => {
    const result = await calculateShipping({
      fulfillmentType: "DELIVERY",
      governorate: "أسوان",
      subtotal: 500,
      settings: settings({ shippingFlatFee: 60 }),
    });
    expect(result.fee).toBe(60);
    expect(result.zone).toBeNull();
  });

  it("يرفض الشحن عندما لا توجد تكلفة للمحافظة", async () => {
    await expect(
      calculateShipping({
        fulfillmentType: "DELIVERY",
        governorate: "أسوان",
        subtotal: 500,
        settings: settings({ shippingFlatFee: 0 }),
      }),
    ).rejects.toMatchObject({ code: "SHIPPING_UNAVAILABLE" });
  });

  it("يرفض التوصيل دون تحديد محافظة", async () => {
    await expect(
      calculateShipping({
        fulfillmentType: "DELIVERY",
        subtotal: 500,
        settings: settings({ shippingFlatFee: 30 }),
      }),
    ).rejects.toMatchObject({ code: "SHIPPING_UNAVAILABLE" });
  });
});

describe("أكواد الخصم", () => {
  it("يحسب خصم النسبة المئوية ويقبل الكود بأحرف صغيرة", async () => {
    await prisma.coupon.create({
      data: { code: "SAVE10", type: "PERCENT", value: 10, minSubtotal: 1000 },
    });

    const result = await validateCoupon({ code: " save10 ", subtotal: 2000 });
    expect(result.discount).toBe(200);
    expect(result.coupon).toEqual({ code: "SAVE10", type: "PERCENT", value: 10 });
  });

  it("لا يجعل الخصم الثابت أكبر من قيمة الطلب", async () => {
    await prisma.coupon.create({
      data: { code: "BIG", type: "FIXED", value: 500, minSubtotal: 0 },
    });

    const result = await validateCoupon({ code: "BIG", subtotal: 300 });
    expect(result.discount).toBe(300);
  });

  it("يرفض الكود المنتهي أو غير المفعّل أو المستنفد", async () => {
    await prisma.coupon.create({
      data: { code: "EXPIRED", type: "PERCENT", value: 10, endsAt: new Date(Date.now() - 86_400_000) },
    });
    await prisma.coupon.create({
      data: { code: "OFF", type: "PERCENT", value: 10, isActive: false },
    });
    await prisma.coupon.create({
      data: { code: "USED", type: "PERCENT", value: 10, maxUses: 1, usedCount: 1 },
    });

    for (const code of ["EXPIRED", "OFF", "USED"]) {
      await expect(validateCoupon({ code, subtotal: 5000 })).rejects.toMatchObject({ code: "COUPON_INVALID" });
    }
  });

  it("يرفض الكود قبل الحد الأدنى للطلب أو قبل بداية صلاحيته", async () => {
    await prisma.coupon.create({
      data: { code: "MIN", type: "PERCENT", value: 10, minSubtotal: 2000 },
    });
    await prisma.coupon.create({
      data: { code: "SOON", type: "PERCENT", value: 10, startsAt: new Date(Date.now() + 86_400_000) },
    });

    await expect(validateCoupon({ code: "MIN", subtotal: 1000 })).rejects.toMatchObject({ code: "COUPON_INVALID" });
    await expect(validateCoupon({ code: "SOON", subtotal: 5000 })).rejects.toMatchObject({ code: "COUPON_INVALID" });
  });

  it("يطبّق الخصم والشحن معًا في عرض السعر", async () => {
    await prisma.shippingZone.create({ data: { governorate: "القاهرة", fee: 50 } });
    await prisma.coupon.create({ data: { code: "TEN", type: "PERCENT", value: 10 } });

    const quote = await buildQuote({
      lines: [line({ unitPrice: 2000, quantity: 1 })],
      couponCode: "TEN",
      fulfillmentType: "DELIVERY",
      governorate: "القاهرة",
      settings: settings(),
    });

    expect(quote.subtotal).toBe(2000);
    expect(quote.discount).toBe(200);
    expect(quote.shippingFee).toBe(50);
    expect(quote.total).toBe(1850);
    expect(quote.coupon?.code).toBe("TEN");
    expect(quote.shippingZone).toBe("القاهرة");
  });

  it("يعيد رمز خطأ واضحًا للكوبون غير الموجود", async () => {
    const error = await validateCoupon({ code: "NOPE", subtotal: 1000 }).catch((e) => e);
    expect(error).toBeInstanceOf(PricingError);
    expect(error.code).toBe("COUPON_INVALID");
  });
});

describe("أسعار المنتجات وتحديثها", () => {
  it("يحسب العرض من الأسعار الحالية في قاعدة البيانات وليس من قيمة قديمة", async () => {
    const product = await createProduct({ price: 1000, quantity: 5 });
    const first = await buildQuote({
      lines: [line({ productId: product.id, unitPrice: Number(product.price), quantity: 1 })],
      fulfillmentType: "PICKUP",
      settings: settings(),
    });
    expect(first.subtotal).toBe(1000);

    await prisma.product.update({ where: { id: product.id }, data: { price: 1500 } });
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });

    const second = await buildQuote({
      lines: [line({ productId: product.id, unitPrice: Number(updated.price), quantity: 1 })],
      fulfillmentType: "PICKUP",
      settings: settings(),
    });
    expect(second.subtotal).toBe(1500);
  });
});

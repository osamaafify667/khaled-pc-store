import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelOrder,
  createOrderFromCart,
  getOrderByAccess,
  getOrderForTracking,
  OrderError,
  reviewPayment,
  submitInstapayProof,
  transitionOrder,
  type CreateOrderInput,
} from "@/server/orders";
import { InventoryError } from "@/server/inventory";
import { PricingError } from "@/server/pricing";
import { AuthError } from "@/server/auth";
import { createAdmin, createCart, createCustomer, createProduct, prisma, resetDatabase } from "./helpers/db";

const customer = {
  fullName: "عميل الاختبار",
  phone: "01012345678",
  email: null,
};

const address = {
  governorate: "القاهرة",
  city: "القاهرة",
  area: "وسط البلد",
  street: "شارع 1",
  building: "2",
};

function orderInput(cartId: string, overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    cartId,
    customer,
    fulfillmentType: "DELIVERY",
    paymentMethod: "CASH_ON_DELIVERY",
    address,
    ...overrides,
  };
}

async function setupShipping() {
  await prisma.shippingZone.upsert({
    where: { governorate: "القاهرة" },
    update: { fee: 50, codAvailable: true, isActive: true },
    create: { governorate: "القاهرة", fee: 50, codAvailable: true },
  });
}

async function setupSettings(overrides: { instapayEnabled?: boolean } = {}) {
  return prisma.storeSettings.upsert({
    where: { id: 1 },
    update: overrides,
    create: { id: 1, ...overrides },
  });
}

beforeEach(async () => {
  await resetDatabase();
  await setupShipping();
});

describe("إنشاء الطلب", () => {
  it("ينشئ طلبًا بأرقام فريدة ويحتفظ بأسعار البيع وقت الشراء", async () => {
    const product = await createProduct({ price: 1000, quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 2 }]);

    const order = await createOrderFromCart(orderInput(cart.id));

    expect(order.orderNumber).toMatch(/^KPS-\d{6}-[A-Z2-9]{6}$/);
    expect(order.status).toBe("PENDING");
    expect(order.paymentStatus).toBe("PENDING");
    expect(Number(order.subtotal)).toBe(2000);
    expect(Number(order.shippingFee)).toBe(50);
    expect(Number(order.discount)).toBe(0);
    expect(Number(order.total)).toBe(2050);
    expect(order.items).toHaveLength(1);
    expect(Number(order.items[0].unitPrice)).toBe(1000);
    expect(Number(order.items[0].lineTotal)).toBe(2000);
    expect(order.items[0].productName).toBe(product.nameAr);
    expect(order.items[0].productSku).toBe(product.sku);

    // تحرير السلة بعد الطلب
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(0);

    // حجز المخزون دون خصمه
    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
    expect(inventory.quantity).toBe(5);
    expect(inventory.reserved).toBe(2);
  });

  it("لا تتغير أسعار الطلب بعد تحديث سعر المنتج", async () => {
    const product = await createProduct({ price: 1000, quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 2 }]);
    const order = await createOrderFromCart(orderInput(cart.id));

    await prisma.product.update({ where: { id: product.id }, data: { price: 1500 } });

    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(Number(stored.items[0].unitPrice)).toBe(1000);
    expect(Number(stored.total)).toBe(2050);

    // الطلب الجديد يستخدم السعر الجديد
    const secondCart = await createCart([{ productId: product.id, quantity: 1 }]);
    const secondOrder = await createOrderFromCart(orderInput(secondCart.id));
    expect(Number(secondOrder.items[0].unitPrice)).toBe(1500);
    expect(secondOrder.orderNumber).not.toBe(order.orderNumber);
  });

  it("يطبّق كود الخصم على السيرفر ويزيد عدد استخداماته", async () => {
    await prisma.coupon.create({ data: { code: "TEN", type: "PERCENT", value: 10 } });
    const product = await createProduct({ price: 1000, quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: "TEN" } });

    const order = await createOrderFromCart(orderInput(cart.id));

    expect(Number(order.discount)).toBe(100);
    expect(Number(order.total)).toBe(950);
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { code: "TEN" } });
    expect(coupon.usedCount).toBe(1);
  });

  it("يرفض الطلب عندما ينفد المخزون", async () => {
    const product = await createProduct({ quantity: 0 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);

    await expect(createOrderFromCart(orderInput(cart.id))).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
    expect(await prisma.order.count()).toBe(0);
  });

  it("يرفض طلب منتج غير منشور", async () => {
    const product = await createProduct({ quantity: 3, status: "DRAFT" });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);

    await expect(createOrderFromCart(orderInput(cart.id))).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("يرفض السلة الفارغة", async () => {
    const cart = await createCart([]);
    await expect(createOrderFromCart(orderInput(cart.id))).rejects.toMatchObject({ code: "CART_EMPTY" });
  });

  it("يرفض التوصيل دون عنوان", async () => {
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);

    await expect(
      createOrderFromCart(orderInput(cart.id, { address: null })),
    ).rejects.toMatchObject({ code: "ADDRESS_REQUIRED" });
  });

  it("يرفض الدفع عند الاستلام إذا كان معطّلًا في المحافظة", async () => {
    await prisma.shippingZone.update({
      where: { governorate: "القاهرة" },
      data: { codAvailable: false },
    });
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);

    await expect(createOrderFromCart(orderInput(cart.id))).rejects.toMatchObject({ code: "COD_UNAVAILABLE" });
  });

  it("يرفض توليفات الدفع والاستلام غير الصحيحة", async () => {
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);

    await expect(
      createOrderFromCart(orderInput(cart.id, { fulfillmentType: "PICKUP", paymentMethod: "CASH_ON_DELIVERY" })),
    ).rejects.toMatchObject({ code: "INVALID_PAYMENT" });

    await expect(
      createOrderFromCart(orderInput(cart.id, { paymentMethod: "PICKUP_CASH" })),
    ).rejects.toMatchObject({ code: "INVALID_PAYMENT" });
  });

  it("يرفض إنستاباي إذا كان معطّلًا في الإعدادات", async () => {
    await setupSettings({ instapayEnabled: false });
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);

    await expect(
      createOrderFromCart(orderInput(cart.id, { fulfillmentType: "PICKUP", paymentMethod: "INSTAPAY", address: null })),
    ).rejects.toMatchObject({ code: "PAYMENT_DISABLED" });
  });
});

describe("حجز آخر قطعة — التزامن", () => {
  it("يسمح لعميل واحد فقط بشراء آخر قطعة", async () => {
    // ننشئ الإعدادات مسبقًا لتجنب تسابق upsert بين المعاملتين
    await setupSettings();
    const product = await createProduct({ quantity: 1 });
    const cartA = await createCart([{ productId: product.id, quantity: 1 }]);
    const cartB = await createCart([{ productId: product.id, quantity: 1 }]);

    const results = await Promise.allSettled([
      createOrderFromCart(orderInput(cartA.id)),
      createOrderFromCart(orderInput(cartB.id)),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    // قد يفشل الخاسر أثناء حساب السعر (PRODUCT_UNAVAILABLE) أو أثناء قفل المخزون
    // (INSUFFICIENT_STOCK) حسب توقيت المعاملتين، وكلاهما سلوك آمن ومقصود.
    expect(reason).toBeInstanceOf(Error);
    expect(["INSUFFICIENT_STOCK", "PRODUCT_UNAVAILABLE"]).toContain(reason.code);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
    expect(inventory.quantity).toBe(1);
    expect(inventory.reserved).toBe(1);
    expect(await prisma.order.count()).toBe(1);
  });
});

describe("إلغاء الطلب", () => {
  it("يحرر الحجز ويعيد استخدام الكوبون ولا يخصم المخزون", async () => {
    await prisma.coupon.create({ data: { code: "TEN", type: "PERCENT", value: 10 } });
    const product = await createProduct({ price: 1000, quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 2 }]);
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: "TEN" } });
    const order = await createOrderFromCart(orderInput(cart.id));
    const admin = await createAdmin();

    const cancelled = await cancelOrder({
      orderId: order.id,
      actorId: admin.id,
      reason: "طلب العميل الإلغاء",
    });

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("طلب العميل الإلغاء");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
    expect(inventory.quantity).toBe(5);
    expect(inventory.reserved).toBe(0);

    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { code: "TEN" } });
    expect(coupon.usedCount).toBe(0);

    const movements = await prisma.stockMovement.findMany({ where: { orderId: order.id } });
    expect(movements.some((movement) => movement.type === "ORDER_RELEASE")).toBe(true);
  });

  it("يمنع العميل العادي من إلغاء أي طلب", async () => {
    const product = await createProduct({ quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(orderInput(cart.id));
    const customerUser = await createCustomer();

    await expect(
      cancelOrder({ orderId: order.id, actorId: customerUser.id, reason: "محاولة غير مصرح بها" }),
    ).rejects.toBeInstanceOf(AuthError);

    const unchanged = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(unchanged.status).toBe("PENDING");
  });
});

describe("حالات الطلب", () => {
  it("يمنع الانتقالات غير المسموحة", async () => {
    const product = await createProduct({ quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(orderInput(cart.id));
    const admin = await createAdmin();

    await expect(
      transitionOrder({ orderId: order.id, actorId: admin.id, status: "DELIVERED", collectCash: true }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("ينفّذ المسار الكامل حتى التسليم ويخصم المخزون ويزيد المبيعات", async () => {
    const product = await createProduct({ price: 1000, quantity: 5 });
    const cart = await createCart([{ productId: product.id, quantity: 2 }]);
    const order = await createOrderFromCart(orderInput(cart.id));
    const admin = await createAdmin();

    const confirmed = await transitionOrder({ orderId: order.id, actorId: admin.id, status: "CONFIRMED" });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.confirmedAt).toBeInstanceOf(Date);

    const processing = await transitionOrder({ orderId: order.id, actorId: admin.id, status: "PROCESSING" });
    expect(processing.status).toBe("PROCESSING");

    const shipped = await transitionOrder({
      orderId: order.id,
      actorId: admin.id,
      status: "SHIPPED",
      trackingNumber: "TRK-123",
      carrier: "شركة الشحن",
    });
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.trackingNumber).toBe("TRK-123");
    expect(shipped.carrier).toBe("شركة الشحن");

    const delivered = await transitionOrder({
      orderId: order.id,
      actorId: admin.id,
      status: "DELIVERED",
      collectCash: true,
    });
    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.paymentStatus).toBe("PAID");
    expect(delivered.deliveredAt).toBeInstanceOf(Date);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
    expect(inventory.quantity).toBe(3);
    expect(inventory.reserved).toBe(0);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.salesCount).toBe(2);

    const fulfill = await prisma.stockMovement.findFirst({
      where: { orderId: order.id, type: "ORDER_FULFILL" },
    });
    expect(fulfill?.quantityChange).toBe(-2);
  });

  it("لا يمكن تسليم طلب إنستاباي قبل اعتماد الدفع", async () => {
    await setupSettings({ instapayEnabled: true });
    const product = await createProduct({ price: 1000, quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(
      orderInput(cart.id, { fulfillmentType: "PICKUP", paymentMethod: "INSTAPAY", address: null }),
    );
    const admin = await createAdmin();

    await transitionOrder({ orderId: order.id, actorId: admin.id, status: "CONFIRMED" });
    await transitionOrder({ orderId: order.id, actorId: admin.id, status: "PROCESSING" });
    await transitionOrder({ orderId: order.id, actorId: admin.id, status: "SHIPPED" });

    await expect(
      transitionOrder({ orderId: order.id, actorId: admin.id, status: "DELIVERED" }),
    ).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
  });
});

describe("مراجعة دفع إنستاباي", () => {
  it("يحوّل الطلب للمراجعة اليدوية ثم يعتمده المدير فقط", async () => {
    await setupSettings({ instapayEnabled: true });
    const product = await createProduct({ price: 1000, quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(
      orderInput(cart.id, { fulfillmentType: "PICKUP", paymentMethod: "INSTAPAY", address: null }),
    );
    const admin = await createAdmin();
    const customerUser = await createCustomer();

    await expect(
      submitInstapayProof({
        orderNumber: order.orderNumber,
        accessToken: "wrong-token",
        reference: "IP-123456",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const submitted = await submitInstapayProof({
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      reference: "IP-123456",
    });
    expect(submitted.paymentStatus).toBe("UNDER_REVIEW");
    expect(submitted.payment?.status).toBe("UNDER_REVIEW");
    expect(submitted.payment?.reference).toBe("IP-123456");
    expect(submitted.paymentStatus).not.toBe("PAID");

    await expect(
      reviewPayment({
        paymentId: submitted.payment!.id,
        actorId: customerUser.id,
        decision: "APPROVE",
      }),
    ).rejects.toBeInstanceOf(AuthError);

    await expect(
      reviewPayment({
        paymentId: submitted.payment!.id,
        actorId: admin.id,
        decision: "REJECT",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PAYMENT" });

    const rejected = await reviewPayment({
      paymentId: submitted.payment!.id,
      actorId: admin.id,
      decision: "REJECT",
      reason: "المرجع غير مطابق",
    });
    expect(rejected.paymentStatus).toBe("REJECTED");
    expect(rejected.payment?.rejectionReason).toBe("المرجع غير مطابق");

    // يمكن للعميل إعادة إرسال إثبات بعد الرفض
    const resubmitted = await submitInstapayProof({
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      reference: "IP-999999",
    });
    expect(resubmitted.paymentStatus).toBe("UNDER_REVIEW");

    const approved = await reviewPayment({
      paymentId: resubmitted.payment!.id,
      actorId: admin.id,
      decision: "APPROVE",
    });
    expect(approved.paymentStatus).toBe("PAID");
    expect(approved.payment?.status).toBe("PAID");
    expect(approved.payment?.reviewedById).toBe(admin.id);

    await transitionOrder({ orderId: order.id, actorId: admin.id, status: "CONFIRMED" });
    await transitionOrder({ orderId: order.id, actorId: admin.id, status: "PROCESSING" });
    await transitionOrder({ orderId: order.id, actorId: admin.id, status: "SHIPPED" });
    const delivered = await transitionOrder({ orderId: order.id, actorId: admin.id, status: "DELIVERED" });
    expect(delivered.status).toBe("DELIVERED");
  });

  it("لا يعتمد مراجعة الدفع لطلب نقدي", async () => {
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(orderInput(cart.id));
    const admin = await createAdmin();

    await expect(
      reviewPayment({ paymentId: order.payment!.id, actorId: admin.id, decision: "APPROVE" }),
    ).rejects.toMatchObject({ code: "INVALID_PAYMENT" });
  });
});

describe("تتبع الطلب والوصول برابط آمن", () => {
  it("يجد الطلب برقم الهاتف بعد توحيد الصيغة", async () => {
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(orderInput(cart.id));

    const tracked = await getOrderForTracking(order.orderNumber, "+20 101 234 5678");
    expect(tracked?.id).toBe(order.id);

    const wrongPhone = await getOrderForTracking(order.orderNumber, "01111111111");
    expect(wrongPhone).toBeNull();
  });

  it("لا يكشف الطلب إلا برمز الوصول الصحيح", async () => {
    const product = await createProduct({ quantity: 3 });
    const cart = await createCart([{ productId: product.id, quantity: 1 }]);
    const order = await createOrderFromCart(orderInput(cart.id));

    expect((await getOrderByAccess(order.orderNumber, order.accessToken))?.id).toBe(order.id);
    expect(await getOrderByAccess(order.orderNumber, "bad-token")).toBeNull();
  });
});

describe("أخطاء الطلب المعروفة", () => {
  it("يستخدم أنواع أخطاء واضحة للواجهة", () => {
    expect(new OrderError("CART_EMPTY", "فارغة")).toBeInstanceOf(Error);
    expect(new InventoryError("INSUFFICIENT_STOCK", "مخزون")).toBeInstanceOf(Error);
    expect(new PricingError("COUPON_INVALID", "كوبون")).toBeInstanceOf(Error);
  });
});

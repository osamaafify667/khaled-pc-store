import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSettings } from "./settings";
import { buildQuote, PricingError, roundMoney, validateCoupon, type OrderQuote } from "./pricing";
import { availableQuantity } from "./catalog";
import { fulfillStockForOrder, releaseStockForOrder, reserveStock, InventoryError, type StockLine } from "./inventory";
import { recordAudit } from "./audit";
import { ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { generateOrderNumber, randomToken } from "@/lib/utils";
import { normalizeEgyptianPhone } from "@/lib/phone";
import { requireAdminById, requireUserById } from "./auth";

export class OrderError extends Error {
  code:
    | "CART_EMPTY"
    | "NOT_FOUND"
    | "INVALID_STATUS"
    | "INVALID_PAYMENT"
    | "PAYMENT_REQUIRED"
    | "FORBIDDEN"
    | "ADDRESS_REQUIRED"
    | "PAYMENT_DISABLED"
    | "COD_UNAVAILABLE";
  constructor(code: OrderError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const orderCartInclude = {
  items: {
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
          inventory: true,
          brand: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type OrderCart = Prisma.CartGetPayload<{ include: typeof orderCartInclude }>;

export const orderInclude = {
  items: { orderBy: { id: "asc" as const } },
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export interface CreateOrderInput {
  userId?: string | null;
  cartId: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string | null;
  };
  fulfillmentType: "DELIVERY" | "PICKUP";
  paymentMethod: "CASH_ON_DELIVERY" | "PICKUP_CASH" | "INSTAPAY";
  address?: {
    governorate: string;
    city: string;
    area?: string;
    street: string;
    building?: string;
    notes?: string;
    save?: boolean;
    label?: string;
  } | null;
  notes?: string | null;
  saveAddress?: boolean;
  ip?: string | null;
}

function stockLinesFromCart(cart: OrderCart): StockLine[] {
  return cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    productName: item.product.nameAr,
  }));
}

function pricingLinesFromCart(cart: OrderCart) {
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

async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const candidate = generateOrderNumber();
    const existing = await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new OrderError("INVALID_STATUS", "تعذر إنشاء رقم طلب فريد، حاول مرة أخرى");
}

export async function createOrderFromCart(input: CreateOrderInput): Promise<OrderWithDetails> {
  const settings = await getSettings();

  if (input.fulfillmentType === "DELIVERY" && input.paymentMethod === "PICKUP_CASH") {
    throw new OrderError("INVALID_PAYMENT", "الدفع عند الاستلام من المحل متاح مع الاستلام فقط");
  }
  if (input.fulfillmentType === "PICKUP" && input.paymentMethod === "CASH_ON_DELIVERY") {
    throw new OrderError("INVALID_PAYMENT", "الدفع عند الاستلام متاح مع التوصيل فقط");
  }
  if (input.paymentMethod === "CASH_ON_DELIVERY" && !settings.codEnabled) {
    throw new OrderError("PAYMENT_DISABLED", "الدفع عند الاستلام غير متاح حاليًا");
  }
  if (input.paymentMethod === "PICKUP_CASH" && !settings.pickupEnabled) {
    throw new OrderError("PAYMENT_DISABLED", "الاستلام من المحل غير متاح حاليًا");
  }
  if (input.paymentMethod === "INSTAPAY" && !settings.instapayEnabled) {
    throw new OrderError("PAYMENT_DISABLED", "الدفع عبر إنستاباي غير متاح حاليًا");
  }
  if (input.fulfillmentType === "DELIVERY" && !input.address) {
    throw new OrderError("ADDRESS_REQUIRED", "عنوان التوصيل مطلوب");
  }

  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({ where: { id: input.cartId }, include: orderCartInclude });
      if (!cart || cart.items.length === 0) throw new OrderError("CART_EMPTY", "سلة الشراء فارغة");

      for (const item of cart.items) {
        if (item.product.status !== "ACTIVE") {
          throw new OrderError("INVALID_STATUS", `المنتج «${item.product.nameAr}» لم يعد متاحًا للبيع`);
        }
      }

      if (input.paymentMethod === "CASH_ON_DELIVERY" && input.address) {
        const zone = await tx.shippingZone.findFirst({
          where: { governorate: input.address.governorate, isActive: true },
        });
        if (zone && !zone.codAvailable) {
          throw new OrderError("COD_UNAVAILABLE", "الدفع عند الاستلام غير متاح في هذه المحافظة");
        }
      }

      const quote = await buildQuote({
        lines: pricingLinesFromCart(cart),
        couponCode: cart.couponCode,
        fulfillmentType: input.fulfillmentType,
        governorate: input.fulfillmentType === "DELIVERY" ? input.address?.governorate : null,
        settings,
        db: tx,
      });

      if (cart.couponCode) {
        const validated = await validateCoupon({ code: cart.couponCode, subtotal: quote.subtotal, db: tx });
        const updated = await tx.coupon.updateMany({
          where: {
            id: validated.couponId,
            ...(await tx.coupon
              .findUnique({ where: { id: validated.couponId }, select: { maxUses: true } })
              .then((c) =>
                c?.maxUses === null || c?.maxUses === undefined ? {} : { usedCount: { lt: c.maxUses } },
              )),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count === 0) throw new OrderError("INVALID_STATUS", "تم استخدام كود الخصم بالكامل");
      }

      const orderNumber = await nextOrderNumber(tx);
      const accessToken = randomToken(24);
      const pickupCode =
        input.fulfillmentType === "PICKUP"
          ? String(Math.floor(100000 + Math.random() * 900000))
          : null;

      const address = input.fulfillmentType === "DELIVERY" ? input.address! : null;

      const order = await tx.order.create({
        data: {
          orderNumber,
          accessToken,
          userId: input.userId ?? null,
          status: "PENDING",
          fulfillmentType: input.fulfillmentType,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
          subtotal: quote.subtotal,
          shippingFee: quote.shippingFee,
          discount: quote.discount,
          total: quote.total,
          couponCode: quote.coupon?.code ?? null,
          customerName: input.customer.fullName.trim(),
          customerPhone: normalizeEgyptianPhone(input.customer.phone),
          customerEmail: input.customer.email || null,
          shippingGovernorate: address?.governorate ?? null,
          shippingCity: address?.city ?? null,
          shippingArea: address?.area ?? null,
          shippingStreet: address?.street ?? null,
          shippingBuilding: address?.building ?? null,
          shippingNotes: address?.notes ?? null,
          notes: input.notes ?? null,
          pickupCode,
          items: {
            create: quote.lines.map((line) => ({
              productId: line.productId,
              productName: line.name,
              productSku: line.sku,
              productSlug: line.slug,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
            })),
          },
          payment: {
            create: {
              method: input.paymentMethod,
              status: "PENDING",
              amount: quote.total,
            },
          },
        },
        include: orderInclude,
      });

      await reserveStock(tx, stockLinesFromCart(cart), orderNumber, input.userId ?? null);

      if (input.userId && input.saveAddress && address) {
        await tx.address.create({
          data: {
            userId: input.userId,
            label: address.label ?? null,
            recipient: input.customer.fullName,
            phone: normalizeEgyptianPhone(input.customer.phone),
            governorate: address.governorate,
            city: address.city,
            area: address.area ?? null,
            street: address.street,
            building: address.building ?? null,
            notes: address.notes ?? null,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

      await recordAudit(tx, {
        userId: input.userId ?? null,
        action: "ORDER_CREATED",
        entity: "Order",
        entityId: order.id,
        orderId: order.id,
        ip: input.ip,
        details: {
          orderNumber,
          total: quote.total,
          paymentMethod: input.paymentMethod,
          itemCount: quote.lines.length,
        },
      });

      return order;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/** تحرير الحجز وإلغاء الطلب — يُستخدم من الأدمن فقط. */
export async function cancelOrder(input: {
  orderId: string;
  actorId: string;
  reason: string;
  ip?: string | null;
}): Promise<OrderWithDetails> {
  await requireAdminById(input.actorId);
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: input.orderId }, include: orderInclude });
      if (!order) throw new OrderError("NOT_FOUND", "الطلب غير موجود");
      if (order.status === "CANCELLED") return order;
      if (order.status === "DELIVERED") {
        throw new OrderError("INVALID_STATUS", "لا يمكن إلغاء طلب تم تسليمه. استخدم مسار المرتجعات.");
      }

      const lines: StockLine[] = order.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId!,
          quantity: item.quantity,
          productName: item.productName,
        }));

      await releaseStockForOrder(tx, order.id, order.orderNumber, lines, input.actorId);

      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: input.reason,
          adminNotes: order.adminNotes
            ? `${order.adminNotes}\n[إلغاء] ${input.reason}`
            : `[إلغاء] ${input.reason}`,
        },
        include: orderInclude,
      });

      await recordAudit(tx, {
        userId: input.actorId,
        action: "ORDER_CANCELLED",
        entity: "Order",
        entityId: order.id,
        orderId: order.id,
        ip: input.ip,
        details: { reason: input.reason, orderNumber: order.orderNumber },
      });

      return updated;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

export async function transitionOrder(input: {
  orderId: string;
  actorId: string;
  status: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  note?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  collectCash?: boolean;
  cancelReason?: string | null;
  ip?: string | null;
}): Promise<OrderWithDetails> {
  await requireAdminById(input.actorId);

  if (input.status === "CANCELLED") {
    const reason = input.cancelReason?.trim() || input.note?.trim();
    if (!reason) throw new OrderError("INVALID_STATUS", "سبب الإلغاء مطلوب");
    return cancelOrder({ orderId: input.orderId, actorId: input.actorId, reason, ip: input.ip });
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: input.orderId }, include: orderInclude });
      if (!order) throw new OrderError("NOT_FOUND", "الطلب غير موجود");
      if (!ORDER_STATUS_TRANSITIONS[order.status]?.includes(input.status)) {
        throw new OrderError(
          "INVALID_STATUS",
          `لا يمكن الانتقال من حالة «${order.status}» إلى «${input.status}»`,
        );
      }

      const lines: StockLine[] = order.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId!,
          quantity: item.quantity,
          productName: item.productName,
        }));

      const now = new Date();
      const data: Prisma.OrderUpdateInput = {
        status: input.status,
        adminNotes: input.note
          ? order.adminNotes
            ? `${order.adminNotes}\n${input.note}`
            : input.note
          : order.adminNotes,
      };

      if (input.status === "CONFIRMED") data.confirmedAt = now;
      if (input.status === "SHIPPED") {
        data.shippedAt = now;
        if (input.trackingNumber) data.trackingNumber = input.trackingNumber;
        if (input.carrier) data.carrier = input.carrier;
      }
      if (input.status === "DELIVERED") {
        if (order.paymentMethod === "INSTAPAY" && order.paymentStatus !== "PAID") {
          throw new OrderError("PAYMENT_REQUIRED", "لا يمكن تسليم طلب إنستاباي قبل تأكيد استلام التحويل");
        }
        await fulfillStockForOrder(tx, order.id, order.orderNumber, lines, input.actorId);
        data.deliveredAt = now;
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { salesCount: { increment: item.quantity } },
            });
          }
        }
        if (order.paymentMethod !== "INSTAPAY" && input.collectCash && order.paymentStatus !== "PAID") {
          await tx.payment.updateMany({
            where: { orderId: order.id },
            data: { status: "PAID", reviewedById: input.actorId, reviewedAt: now },
          });
          data.paymentStatus = "PAID";
        }
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data,
        include: orderInclude,
      });

      await recordAudit(tx, {
        userId: input.actorId,
        action: `ORDER_${input.status}`,
        entity: "Order",
        entityId: order.id,
        orderId: order.id,
        ip: input.ip,
        details: {
          from: order.status,
          to: input.status,
          trackingNumber: input.trackingNumber ?? undefined,
          note: input.note ?? undefined,
          collectCash: Boolean(input.collectCash),
        },
      });

      return updated;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

export async function submitInstapayProof(input: {
  orderNumber: string;
  accessToken: string;
  reference: string;
  proofUrl?: string | null;
  ip?: string | null;
}): Promise<OrderWithDetails> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { orderNumber: input.orderNumber, accessToken: input.accessToken },
      include: orderInclude,
    });
    if (!order) throw new OrderError("NOT_FOUND", "الطلب غير موجود");
    if (order.paymentMethod !== "INSTAPAY") {
      throw new OrderError("INVALID_PAYMENT", "هذا الطلب ليس دفعًا عبر إنستاباي");
    }
    if (order.paymentStatus === "PAID") {
      throw new OrderError("INVALID_PAYMENT", "تم تأكيد دفع هذا الطلب بالفعل");
    }
    if (!order.payment) throw new OrderError("INVALID_PAYMENT", "لا توجد بيانات دفع للطلب");

    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        reference: input.reference.trim(),
        proofUrl: input.proofUrl ?? order.payment.proofUrl,
        status: "UNDER_REVIEW",
        rejectionReason: null,
      },
    });
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "UNDER_REVIEW" },
      include: orderInclude,
    });
    await recordAudit(tx, {
      action: "PAYMENT_PROOF_SUBMITTED",
      entity: "Order",
      entityId: order.id,
      orderId: order.id,
      ip: input.ip,
      details: { reference: input.reference, hasProof: Boolean(input.proofUrl) },
    });
    return updated;
  });
}

export async function reviewPayment(input: {
  paymentId: string;
  actorId: string;
  decision: "APPROVE" | "REJECT";
  reason?: string | null;
  ip?: string | null;
}): Promise<OrderWithDetails> {
  await requireAdminById(input.actorId);
  if (input.decision === "REJECT" && !input.reason?.trim()) {
    throw new OrderError("INVALID_PAYMENT", "سبب رفض التحويل مطلوب");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { order: true } });
    if (!payment) throw new OrderError("NOT_FOUND", "عملية الدفع غير موجودة");
    if (payment.method !== "INSTAPAY") {
      throw new OrderError("INVALID_PAYMENT", "المراجعة اليدوية متاحة لتحويلات إنستاباي فقط");
    }
    if (payment.status === "PAID") throw new OrderError("INVALID_PAYMENT", "تم اعتماد هذا الدفع بالفعل");

    const status = input.decision === "APPROVE" ? "PAID" : "REJECTED";
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        reviewedById: input.actorId,
        reviewedAt: new Date(),
        rejectionReason: input.decision === "REJECT" ? input.reason?.trim() : null,
      },
    });
    const updated = await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: status },
      include: orderInclude,
    });

    await recordAudit(tx, {
      userId: input.actorId,
      action: input.decision === "APPROVE" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
      entity: "Payment",
      entityId: payment.id,
      orderId: payment.orderId,
      ip: input.ip,
      details: { reason: input.reason ?? null, amount: Number(payment.amount) },
    });
    return updated;
  });
}

export async function getOrderForTracking(orderNumber: string, phone: string): Promise<OrderWithDetails | null> {
  const normalized = normalizeEgyptianPhone(phone);
  return prisma.order.findFirst({
    where: { orderNumber: orderNumber.trim(), customerPhone: normalized },
    include: orderInclude,
  });
}

export async function getOrderByAccess(orderNumber: string, accessToken: string): Promise<OrderWithDetails | null> {
  return prisma.order.findFirst({
    where: { orderNumber, accessToken },
    include: orderInclude,
  });
}

export async function getOrderForUser(orderNumber: string, userId: string): Promise<OrderWithDetails | null> {
  await requireUserById(userId);
  return prisma.order.findFirst({ where: { orderNumber, userId }, include: orderInclude });
}

export interface AdminOrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  pageSize?: number;
}

export async function listAdminOrders(filters: AdminOrderFilters = {}) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const where: Prisma.OrderWhereInput = {};
  if (filters.status) where.status = filters.status as Prisma.EnumOrderStatusFilter["equals"];
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus as Prisma.EnumPaymentStatusFilter["equals"];
  if (filters.search) {
    const search = filters.search.trim();
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      ...orderInclude,
      user: { select: { id: true, email: true, name: true, phone: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } },
    },
  });
}

export function safeOrderSummary(order: OrderWithDetails) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    fulfillmentType: order.fulfillmentType,
    total: Number(order.total),
    placedAt: order.placedAt,
  };
}

export { PricingError, InventoryError, roundMoney, type OrderQuote };

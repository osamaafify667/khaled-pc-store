import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  const paymentStatus = params.get("paymentStatus") ?? "";

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as "PENDING" | "UNDER_REVIEW" | "PAID" | "REJECTED" | "REFUNDED" } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" as const } },
              { customerName: { contains: q, mode: "insensitive" as const } },
              { customerPhone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { items: true },
    orderBy: { placedAt: "desc" },
    take: 5000,
  });

  const csv = toCsv(
    [
      "orderNumber",
      "placedAt",
      "customerName",
      "customerPhone",
      "customerEmail",
      "fulfillmentType",
      "governorate",
      "city",
      "area",
      "street",
      "building",
      "status",
      "paymentMethod",
      "paymentStatus",
      "subtotal",
      "shipping",
      "discount",
      "total",
      "couponCode",
      "trackingNumber",
      "carrier",
      "items",
    ],
    orders.map((order) => [
      order.orderNumber,
      order.placedAt.toISOString(),
      order.customerName,
      order.customerPhone,
      order.customerEmail ?? "",
      order.fulfillmentType,
      order.shippingGovernorate ?? "",
      order.shippingCity ?? "",
      order.shippingArea ?? "",
      order.shippingStreet ?? "",
      order.shippingBuilding ?? "",
      order.status,
      order.paymentMethod,
      order.paymentStatus,
      order.subtotal.toString(),
      order.shippingFee.toString(),
      order.discount.toString(),
      order.total.toString(),
      order.couponCode ?? "",
      order.trackingNumber ?? "",
      order.carrier ?? "",
      order.items.map((item) => `${item.productSku}×${item.quantity}`).join(" | "),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { prisma } from "./db";
import { availableQuantity } from "./catalog";

export type DashboardRange = 7 | 30 | 90;

export async function getDashboardStats(range: DashboardRange = 30) {
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    newOrders,
    awaitingPayment,
    salesAggregate,
    ordersInRange,
    lowStockRows,
    outOfStockRows,
    recentOrders,
    chartRows,
    customersCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { paymentStatus: "UNDER_REVIEW" } }),
    prisma.order.aggregate({
      where: {
        status: { not: "CANCELLED" },
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({ where: { placedAt: { gte: since } } }),
    prisma.inventory.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: { select: { id: true, nameAr: true, slug: true, sku: true } } },
    }),
    prisma.inventory.findMany({
      where: { quantity: { lte: 0 } },
      include: { product: { select: { id: true, nameAr: true, slug: true, sku: true } } },
      take: 20,
    }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        paymentStatus: true,
        placedAt: true,
      },
    }),
    prisma.$queryRaw<Array<{ day: Date; orders: bigint; revenue: unknown }>>`
      SELECT date_trunc('day', "placedAt" AT TIME ZONE 'Africa/Cairo') AS day,
             COUNT(*)::bigint AS orders,
             COALESCE(SUM(total), 0) AS revenue
      FROM "Order"
      WHERE "placedAt" >= ${since} AND status <> 'CANCELLED'
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  // الأكثر مبيعًا — استعلام مباشر يعتمد على قطع الطلبات غير الملغاة
  const topProducts = await prisma.$queryRaw<
    Array<{ productId: string; name: string; slug: string; quantity: bigint }>
  >`
    SELECT oi."productId", MAX(oi."productName") AS name, MAX(p.slug) AS slug, SUM(oi.quantity)::bigint AS quantity
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    LEFT JOIN "Product" p ON p.id = oi."productId"
    WHERE o.status <> 'CANCELLED' AND oi."productId" IS NOT NULL
    GROUP BY oi."productId"
    ORDER BY quantity DESC
    LIMIT 5
  `.catch(() => []);

  const lowStock = lowStockRows
    .filter((row) => availableQuantity(row) <= row.lowStockThreshold)
    .map((row) => ({
      id: row.product.id,
      name: row.product.nameAr,
      slug: row.product.slug,
      sku: row.product.sku,
      available: availableQuantity(row),
      threshold: row.lowStockThreshold,
    }));

  const outOfStock = outOfStockRows.map((row) => ({
    id: row.product.id,
    name: row.product.nameAr,
    slug: row.product.slug,
    sku: row.product.sku,
  }));

  // ملء الأيام الفارغة في الرسم البياني
  const chartMap = new Map<string, { orders: number; revenue: number }>();
  for (const row of chartRows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    chartMap.set(key, { orders: Number(row.orders), revenue: Number(row.revenue) });
  }
  const chart: Array<{ day: string; label: string; orders: number; revenue: number }> = [];
  for (let i = range - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const data = chartMap.get(key) ?? { orders: 0, revenue: 0 };
    chart.push({
      day: key,
      label: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short" }).format(date),
      ...data,
    });
  }

  return {
    range,
    counts: {
      totalOrders,
      newOrders,
      awaitingPayment,
      ordersInRange,
      customersCount,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
    },
    confirmedSales: Number(salesAggregate._sum.total ?? 0),
    confirmedOrders: salesAggregate._count,
    lowStock: lowStock.slice(0, 8),
    outOfStock: outOfStock.slice(0, 8),
    topProducts: topProducts.map((row) => ({
      productId: row.productId,
      name: row.name,
      slug: row.slug,
      quantity: Number(row.quantity),
    })),
    recentOrders,
    chart,
  };
}

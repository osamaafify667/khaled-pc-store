import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/auth";
import { toCsv, PRODUCT_CSV_HEADERS } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";

  const products = await prisma.product.findMany({
    where: {
      ...(status ? { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { nameAr: { contains: q, mode: "insensitive" as const } },
              { nameEn: { contains: q, mode: "insensitive" as const } },
              { sku: { contains: q, mode: "insensitive" as const } },
              { model: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { slug: true } },
      brand: { select: { name: true } },
      inventory: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const csv = toCsv(
    [...PRODUCT_CSV_HEADERS],
    products.map((product) => [
      product.sku,
      product.nameAr,
      product.nameEn ?? "",
      product.slug,
      product.model ?? "",
      product.category.slug,
      product.brand?.name ?? "",
      product.price.toString(),
      product.compareAtPrice?.toString() ?? "",
      product.inventory?.quantity ?? 0,
      product.inventory?.lowStockThreshold ?? 3,
      product.warrantyMonths,
      product.status,
      product.type,
      product.descriptionAr ?? "",
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

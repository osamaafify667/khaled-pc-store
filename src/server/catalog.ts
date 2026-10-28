import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { PAGE_SIZE } from "@/lib/constants";

export const productListInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 3 },
  inventory: true,
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, nameAr: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type ProductListItem = Prisma.ProductGetPayload<{ include: typeof productListInclude }>;

export const productDetailInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: true,
  brand: true,
  category: true,
  specs: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.ProductInclude;

export type ProductDetail = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

export interface StoreProductFilters {
  search?: string;
  category?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "best_selling";
  page?: number;
  pageSize?: number;
  featured?: boolean;
  type?: "COMPONENT" | "PREBUILT";
  excludeId?: string;
}

export function availableQuantity(inventory: { quantity: number; reserved: number } | null | undefined): number {
  if (!inventory) return 0;
  return Math.max(inventory.quantity - inventory.reserved, 0);
}

export function buildProductWhere(filters: StoreProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (filters.type) where.type = filters.type;
  if (filters.featured) where.isFeatured = true;
  if (filters.excludeId) where.id = { not: filters.excludeId };

  if (filters.category) {
    where.category = {
      OR: [{ slug: filters.category }, { parent: { slug: filters.category } }],
    };
  }

  if (filters.brands?.length) {
    where.brand = { slug: { in: filters.brands } };
  }

  if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
    where.price = {};
    if (typeof filters.minPrice === "number") where.price.gte = filters.minPrice;
    if (typeof filters.maxPrice === "number") where.price.lte = filters.maxPrice;
  }

  if (filters.inStock) {
    where.inventory = { is: { quantity: { gt: 0 } } };
  }

  if (filters.search) {
    const search = filters.search.trim();
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { category: { nameAr: { contains: search, mode: "insensitive" } } },
      ];
    }
  }

  return where;
}

export function productOrderBy(sort: StoreProductFilters["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "best_selling":
      return [{ salesCount: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function getStoreProducts(filters: StoreProductFilters = {}) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? PAGE_SIZE, 1), 48);
  const where = buildProductWhere(filters);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productListInclude,
      orderBy: productOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: productDetailInclude,
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { ...productDetailInclude, images: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 4) {
  return prisma.product.findMany({
    where: { categoryId, status: "ACTIVE", id: { not: excludeId } },
    include: productListInclude,
    orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getCategories(activeOnly = true) {
  return prisma.category.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
  });
}

export async function getBrands(activeOnly = true) {
  return prisma.brand.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    include: {
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      parent: true,
    },
  });
}

export async function getLatestProducts(limit = 8) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", type: "COMPONENT" },
    include: productListInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getBestSellers(limit = 8) {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: productListInclude,
    orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getFeaturedProducts(limit = 4) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", isFeatured: true },
    include: productListInclude,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getOfferProducts(limit = 4) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", compareAtPrice: { not: null } },
    include: productListInclude,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getPrebuiltPcs(limit = 6) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", type: "PREBUILT" },
    include: {
      ...productListInclude,
      specs: { orderBy: { sortOrder: "asc" }, take: 8 },
    },
    orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

/** منتجات منشئ التجميعات مجمّعة حسب سلَغ التصنيف */
export async function getBuilderCatalog(slotSlugs: string[]) {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      type: "COMPONENT",
      category: { slug: { in: slotSlugs } },
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      inventory: true,
      brand: { select: { name: true } },
      category: { select: { slug: true } },
      specs: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ inventory: { quantity: "desc" } }, { price: "asc" }],
  });
  return products;
}

export async function getStoreStats() {
  const [products, categories, brands] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.brand.count({ where: { isActive: true } }),
  ]);
  return { products, categories, brands };
}

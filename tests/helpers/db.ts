import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth";
import { randomToken } from "@/lib/utils";
import type { BuildComponent, BuildSlot, SpecMap } from "@/server/compatibility/types";

const TABLES = [
  "AuditLog",
  "StockMovement",
  "OrderItem",
  "Payment",
  "Order",
  "CartItem",
  "Cart",
  "BuildItem",
  "Build",
  "ProductSpecification",
  "ProductImage",
  "Inventory",
  "Product",
  "Category",
  "Brand",
  "ShippingZone",
  "Coupon",
  "CompatibilityRule",
  "Session",
  "LoginAttempt",
  "Address",
  "StoreSettings",
  "User",
];

/** يفرّغ كل جداول قاعدة الاختبار مع الحفاظ على الترحيلات. */
export async function resetDatabase(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export async function createAdmin(overrides: { email?: string; name?: string; password?: string } = {}) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `admin-${suffix}@test.local`,
      name: overrides.name ?? "مدير الاختبار",
      passwordHash: await hashPassword(overrides.password ?? "AdminPass123!"),
      role: "ADMIN",
    },
  });
}

export async function createCustomer(overrides: { email?: string; name?: string; password?: string } = {}) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `customer-${suffix}@test.local`,
      name: overrides.name ?? "عميل الاختبار",
      passwordHash: await hashPassword(overrides.password ?? "CustomerPass123!"),
      role: "CUSTOMER",
    },
  });
}

export async function ensureCategory(slug = "cpu", nameAr = "المعالجات") {
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, nameAr, nameEn: slug },
  });
}

export type ProductOptions = {
  sku?: string;
  nameAr?: string;
  price?: number;
  quantity?: number;
  reserved?: number;
  lowStockThreshold?: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  type?: "COMPONENT" | "PREBUILT";
  categorySlug?: string;
  specs?: SpecMap;
};

export async function createProduct(options: ProductOptions = {}) {
  const suffix = uniqueSuffix();
  const sku = options.sku ?? `SKU-${suffix}`;
  const category = await ensureCategory(options.categorySlug ?? "cpu");
  const specs = Object.entries(options.specs ?? {}).map(([key, raw], index) => {
    const dataType = typeof raw === "number" ? "NUMBER" : typeof raw === "boolean" ? "BOOLEAN" : "TEXT";
    const value =
      typeof raw === "boolean" ? (raw ? "true" : "false") : raw === null || raw === undefined ? "" : String(raw);
    return {
      key,
      label: key,
      value,
      numericValue: dataType === "NUMBER" ? Number(raw) : null,
      dataType: dataType as "TEXT" | "NUMBER" | "BOOLEAN",
      sortOrder: index,
    };
  });

  return prisma.product.create({
    data: {
      sku,
      slug: `${sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`,
      nameAr: options.nameAr ?? `منتج ${suffix}`,
      nameEn: `Product ${suffix}`,
      price: options.price ?? 1000,
      status: options.status ?? "ACTIVE",
      type: options.type ?? "COMPONENT",
      warrantyMonths: 12,
      categoryId: category.id,
      specs: { create: specs },
      inventory: {
        create: {
          quantity: options.quantity ?? 10,
          reserved: options.reserved ?? 0,
          lowStockThreshold: options.lowStockThreshold ?? 3,
        },
      },
    },
    include: { inventory: true, category: true },
  });
}

export async function createCart(items: Array<{ productId: string; quantity: number }>, userId?: string | null) {
  return prisma.cart.create({
    data: {
      token: randomToken(16),
      userId: userId ?? null,
      items: { create: items },
    },
    include: { items: true },
  });
}

/** يبني مكوّن تجميعة نقية للاختبارات بدون قاعدة بيانات. */
export function component(
  slot: BuildSlot,
  specs: SpecMap,
  overrides: Partial<Pick<BuildComponent, "productId" | "name" | "price" | "available">> = {},
): BuildComponent {
  return {
    slot,
    productId: overrides.productId ?? `${slot}-${randomUUID().slice(0, 6)}`,
    name: overrides.name ?? slot,
    price: overrides.price ?? 1000,
    specs,
    available: overrides.available ?? true,
  };
}

export { prisma };

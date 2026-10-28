import { prisma } from "./db";
import { recordAudit } from "./audit";
import { requireUserById } from "./auth";
import { randomToken } from "@/lib/utils";
import { SLOT_CATEGORY_SLUGS } from "@/lib/constants";
import type { BuildComponent, BuildSlot, RuleOverrides } from "./compatibility";
import { resolvedSpecs } from "./compatibility/specs";
import { availableQuantity } from "./catalog";

export class BuildError extends Error {
  code: "NOT_FOUND" | "INVALID_ITEM" | "FORBIDDEN" | "EMPTY";
  constructor(code: BuildError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export const buildInclude = {
  items: {
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
          inventory: true,
          brand: { select: { name: true } },
          category: { select: { slug: true, nameAr: true } },
          specs: { orderBy: { sortOrder: "asc" as const } },
        },
      },
    },
  },
} as const;

const slotSet = new Set(Object.keys(SLOT_CATEGORY_SLUGS));

export async function saveBuild(input: {
  buildId?: string | null;
  userId?: string | null;
  name: string;
  items: Array<{ productId: string; slot: string; quantity: number }>;
  ip?: string | null;
}) {
  if (input.items.length === 0) throw new BuildError("EMPTY", "أضف قطعة واحدة على الأقل");
  if (input.userId) await requireUserById(input.userId);

  const seenSlots = new Set<string>();
  for (const item of input.items) {
    if (!slotSet.has(item.slot)) throw new BuildError("INVALID_ITEM", "خانة تجميعة غير صحيحة");
    if (seenSlots.has(item.slot)) throw new BuildError("INVALID_ITEM", "لا يمكن تكرار نفس الخانة");
    seenSlots.add(item.slot);
    if (item.quantity < 1 || item.quantity > 10) throw new BuildError("INVALID_ITEM", "كمية غير صحيحة");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) }, status: "ACTIVE" },
    include: { category: { select: { slug: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = byId.get(item.productId);
    if (!product) throw new BuildError("INVALID_ITEM", "أحد مكونات التجميعة غير متاح");
    const expectedSlug = SLOT_CATEGORY_SLUGS[item.slot];
    if (expectedSlug && product.category.slug !== expectedSlug && item.slot !== "ACCESSORY") {
      throw new BuildError("INVALID_ITEM", `«${product.nameAr}» لا ينتمي لخانة ${item.slot}`);
    }
  }

  let buildId = input.buildId ?? null;
  if (buildId) {
    const existing = await prisma.build.findUnique({ where: { id: buildId }, select: { userId: true } });
    if (!existing) {
      buildId = null;
    } else if (!input.userId || existing.userId !== input.userId) {
      buildId = null;
    }
  }

  const itemsData = input.items.map((item) => ({
    productId: item.productId,
    slot: item.slot,
    quantity: item.quantity,
  }));

  if (buildId) {
    const build = await prisma.build.update({
      where: { id: buildId },
      data: {
        name: input.name.trim(),
        items: { deleteMany: {}, create: itemsData },
      },
      include: buildInclude,
    });
    await recordAudit(prisma, {
      userId: input.userId ?? null,
      action: "BUILD_UPDATED",
      entity: "Build",
      entityId: build.id,
      ip: input.ip,
      details: { name: build.name },
    });
    return build;
  }

  const build = await prisma.build.create({
    data: {
      publicId: randomToken(12),
      userId: input.userId ?? null,
      name: input.name.trim(),
      items: { create: itemsData },
    },
    include: buildInclude,
  });
  await recordAudit(prisma, {
    userId: input.userId ?? null,
    action: "BUILD_CREATED",
    entity: "Build",
    entityId: build.id,
    ip: input.ip,
    details: { name: build.name, publicId: build.publicId },
  });
  return build;
}

export async function getBuildByPublicId(publicId: string) {
  return prisma.build.findUnique({ where: { publicId }, include: buildInclude });
}

export async function getUserBuilds(userId: string) {
  return prisma.build.findMany({
    where: { userId },
    include: buildInclude,
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
}

export async function deleteBuild(id: string, userId: string): Promise<void> {
  await requireUserById(userId);
  const build = await prisma.build.findUnique({ where: { id } });
  if (!build) return;
  if (build.userId !== userId) throw new BuildError("FORBIDDEN", "لا تملك هذه التجميعة");
  await prisma.build.delete({ where: { id } });
  await recordAudit(prisma, {
    userId,
    action: "BUILD_DELETED",
    entity: "Build",
    entityId: id,
  });
}

export type BuilderProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  brand: string | null;
  categorySlug: string;
  available: number;
  specs: Record<string, string | number | boolean>;
  specList: Array<{ label: string; value: string; unit: string | null }>;
};

export function toBuilderProduct(product: {
  id: string;
  nameAr: string;
  slug: string;
  price: unknown;
  compareAtPrice: unknown;
  images: Array<{ url: string }>;
  brand: { name: string } | null;
  category: { slug: string };
  inventory: { quantity: number; reserved: number } | null;
  specs: Array<{ key: string; label: string; value: string; numericValue: unknown; dataType: string; unit: string | null }>;
}): BuilderProduct {
  const specs = resolvedSpecs(
    product.specs.map((spec) => ({
      key: spec.key,
      value: spec.value,
      numericValue: spec.numericValue,
      dataType: spec.dataType,
    })),
  );
  const plainSpecs: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(specs)) {
    if (value !== undefined && value !== null) plainSpecs[key] = value;
  }
  return {
    id: product.id,
    name: product.nameAr,
    slug: product.slug,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    image: product.images[0]?.url ?? null,
    brand: product.brand?.name ?? null,
    categorySlug: product.category.slug,
    available: availableQuantity(product.inventory),
    specs: plainSpecs,
    specList: product.specs.slice(0, 8).map((spec) => ({
      label: spec.label,
      value: spec.value,
      unit: spec.unit,
    })),
  };
}

/** قواعد التوافق القابلة للتعطيل/التعديل من لوحة التحكم. */
export async function getCompatibilityOverrides(): Promise<RuleOverrides> {
  const rows = await prisma.compatibilityRule.findMany();
  const overrides: RuleOverrides = {};
  for (const row of rows) {
    const config =
      row.config && typeof row.config === "object" && !Array.isArray(row.config)
        ? (row.config as Record<string, number | string | boolean>)
        : undefined;
    const severity =
      row.severity === "ERROR" ? ("ERROR" as const) : row.severity === "INFO" ? undefined : ("WARNING" as const);
    overrides[row.key] = {
      isActive: row.isActive,
      ...(severity ? { severity } : {}),
      ...(config ? { config } : {}),
    };
  }
  return overrides;
}

export function toBuildComponent(product: BuilderProduct, slot: BuildSlot): BuildComponent {
  return {
    slot,
    productId: product.id,
    name: product.name,
    price: product.price,
    specs: product.specs,
    available: product.available > 0,
  };
}

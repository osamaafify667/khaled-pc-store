import { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "./db";

export class InventoryError extends Error {
  code: "INSUFFICIENT_STOCK" | "NOT_FOUND" | "INVALID_QUANTITY" | "BELOW_RESERVED";
  productId?: string;
  available?: number;
  constructor(
    code: InventoryError["code"],
    message: string,
    extra: { productId?: string; available?: number } = {},
  ) {
    super(message);
    this.code = code;
    this.productId = extra.productId;
    this.available = extra.available;
  }
}

export interface LockedInventory {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}

export interface StockLine {
  productId: string;
  quantity: number;
  productName?: string;
}

/**
 * يقفل صفوف المخزون داخل transaction باستخدام SELECT ... FOR UPDATE.
 * ترتيب المعرّفات ثابت لمنع deadlocks في الطلبات المتزامنة.
 */
export async function lockInventories(
  tx: Prisma.TransactionClient,
  productIds: string[],
): Promise<LockedInventory[]> {
  const ids = [...new Set(productIds)].sort();
  if (ids.length === 0) return [];
  return tx.$queryRaw<LockedInventory[]>(Prisma.sql`
    SELECT id, "productId", quantity, reserved, "lowStockThreshold"
    FROM "Inventory"
    WHERE "productId" IN (${Prisma.join(ids)})
    ORDER BY "productId"
    FOR UPDATE
  `);
}

export function availableOf(inventory: { quantity: number; reserved: number } | null | undefined): number {
  if (!inventory) return 0;
  return Math.max(inventory.quantity - inventory.reserved, 0);
}

/**
 * حجز المخزون للطلب. يجب أن يُستدعى داخل transaction بعد قفل الصفوف.
 * يمنع بيع آخر قطعة لأكثر من عميل لأن القفل يجعل الطلب الثاني يرى الحجز الأول.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  reference: string,
  userId?: string | null,
): Promise<void> {
  const locked = await lockInventories(tx, lines.map((l) => l.productId));
  const byProduct = new Map(locked.map((row) => [row.productId, row]));

  for (const line of lines) {
    const inventory = byProduct.get(line.productId);
    if (!inventory) {
      throw new InventoryError("NOT_FOUND", "لا يوجد سجل مخزون لهذا المنتج", { productId: line.productId, available: 0 });
    }
    const available = availableOf(inventory);
    if (line.quantity < 1 || line.quantity > available) {
      throw new InventoryError(
        "INSUFFICIENT_STOCK",
        `الكمية المتاحة من «${line.productName ?? "المنتج"}» هي ${available} فقط`,
        { productId: line.productId, available },
      );
    }
  }

  for (const line of lines) {
    const updated = await tx.inventory.update({
      where: { productId: line.productId },
      data: { reserved: { increment: line.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        type: "ORDER_RESERVE",
        quantityChange: 0,
        balanceAfter: availableOf(updated),
        reason: `حجز لطلب ${reference}`,
        reference,
        userId: userId ?? null,
      },
    });
  }
}

/** تحرير الحجز عند إلغاء الطلب (لا يغيّر المخزون الفعلي). */
export async function releaseStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  reference: string,
  lines: StockLine[],
  userId?: string | null,
): Promise<void> {
  const locked = await lockInventories(tx, lines.map((l) => l.productId));
  const byProduct = new Map(locked.map((row) => [row.productId, row]));

  for (const line of lines) {
    const inventory = byProduct.get(line.productId);
    if (!inventory) continue;
    const release = Math.min(line.quantity, inventory.reserved);
    if (release <= 0) continue;
    const updated = await tx.inventory.update({
      where: { productId: line.productId },
      data: { reserved: { decrement: release } },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        type: "ORDER_RELEASE",
        quantityChange: 0,
        balanceAfter: availableOf(updated),
        reason: `تحرير حجز الطلب ${reference}`,
        reference,
        orderId,
        userId: userId ?? null,
      },
    });
  }
}

/** خصم المخزون الفعلي عند تسليم الطلب، مع تحرير الحجز. */
export async function fulfillStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  reference: string,
  lines: StockLine[],
  userId?: string | null,
): Promise<void> {
  const locked = await lockInventories(tx, lines.map((l) => l.productId));
  const byProduct = new Map(locked.map((row) => [row.productId, row]));

  for (const line of lines) {
    const inventory = byProduct.get(line.productId);
    if (!inventory) continue;
    if (inventory.quantity < line.quantity) {
      throw new InventoryError(
        "INSUFFICIENT_STOCK",
        `لا يمكن تسليم الطلب: مخزون «${line.productName ?? "المنتج"}» الفعلي أقل من المطلوب`,
        { productId: line.productId, available: inventory.quantity },
      );
    }
    const reservedRelease = Math.min(line.quantity, inventory.reserved);
    const updated = await tx.inventory.update({
      where: { productId: line.productId },
      data: {
        quantity: { decrement: line.quantity },
        reserved: { decrement: reservedRelease },
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        type: "ORDER_FULFILL",
        quantityChange: -line.quantity,
        balanceAfter: availableOf(updated),
        reason: `تسليم الطلب ${reference}`,
        reference,
        orderId,
        userId: userId ?? null,
      },
    });
  }
}

export type AdjustMode = "ADD" | "REMOVE" | "SET";

/** تعديل مخزون يدوي مع تسجيل الحركة والمستخدم والسبب. */
export async function adjustStock(input: {
  productId: string;
  mode: AdjustMode;
  quantity: number;
  reason: string;
  userId: string;
  db?: DbClient;
}): Promise<{ quantity: number; reserved: number; available: number }> {
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new InventoryError("INVALID_QUANTITY", "الكمية يجب أن تكون رقمًا صحيحًا غير سالب");
  }

  const run = async (tx: DbClient) => {
    const [inventory] = await lockInventories(tx as Prisma.TransactionClient, [input.productId]);
    if (!inventory) throw new InventoryError("NOT_FOUND", "المنتج غير موجود في المخزون");

    let newQuantity: number;
    if (input.mode === "ADD") newQuantity = inventory.quantity + input.quantity;
    else if (input.mode === "REMOVE") newQuantity = inventory.quantity - input.quantity;
    else newQuantity = input.quantity;

    if (newQuantity < 0) {
      throw new InventoryError("INVALID_QUANTITY", "لا يمكن أن يصبح المخزون سالبًا");
    }
    if (newQuantity < inventory.reserved) {
      throw new InventoryError(
        "BELOW_RESERVED",
        `لا يمكن خفض المخزون إلى ${newQuantity} لوجود ${inventory.reserved} قطعة محجوزة لطلبات قائمة`,
      );
    }

    const updated = await tx.inventory.update({
      where: { productId: input.productId },
      data: { quantity: newQuantity },
    });
    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        type: input.mode === "ADD" ? "RESTOCK" : "ADJUSTMENT",
        quantityChange: newQuantity - inventory.quantity,
        balanceAfter: availableOf(updated),
        reason: input.reason,
        userId: input.userId,
      },
    });
    return {
      quantity: updated.quantity,
      reserved: updated.reserved,
      available: availableOf(updated),
    };
  };

  if (input.db) return run(input.db);
  return prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function getAvailable(productId: string): Promise<number> {
  const inventory = await prisma.inventory.findUnique({ where: { productId } });
  return availableOf(inventory);
}

export async function getInventoryMap(productIds: string[]): Promise<Map<string, { quantity: number; reserved: number; available: number }>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.inventory.findMany({ where: { productId: { in: productIds } } });
  return new Map(
    rows.map((row) => [
      row.productId,
      { quantity: row.quantity, reserved: row.reserved, available: availableOf(row) },
    ]),
  );
}

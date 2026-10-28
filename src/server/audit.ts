import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "./db";

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
  ip?: string | null;
  orderId?: string | null;
}

/** يمكن استدعاؤه داخل transaction لضمان تسجيل العملية مع تعديلها. */
export async function recordAudit(db: DbClient, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details,
      ip: input.ip ?? null,
      orderId: input.orderId ?? null,
    },
  });
}

export async function recordAuditOutsideTransaction(input: AuditInput): Promise<void> {
  await recordAudit(prisma, input);
}

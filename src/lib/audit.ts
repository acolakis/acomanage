import { prisma } from "@/lib/prisma";

interface AuditLogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export function logAudit(params: AuditLogParams): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : null,
        ipAddress: params.ipAddress || null,
      },
    })
    .catch((err) => console.error("Audit log error:", err));
}

import type { Database } from "../db/client.js";
import { auditEvents } from "../db/schema/platform.js";

export type AuditEventInput = {
  userId: string | null;
  app: string;
  toolName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  requestId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
};

export function createAuditService(db: Pick<Database, "insert">) {
  return {
    async record(input: AuditEventInput) {
      await db.insert(auditEvents).values({
        userId: input.userId,
        app: input.app,
        toolName: input.toolName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        requestId: input.requestId,
        beforeJson: input.beforeJson,
        afterJson: input.afterJson,
      });
    },
  };
}

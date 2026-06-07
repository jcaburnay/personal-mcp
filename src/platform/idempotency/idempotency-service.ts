import { and, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { idempotencyKeys } from "../db/schema/platform.js";

export function createIdempotencyKey(userId: string, toolName: string, clientRequestId: string) {
  return `${userId}:${toolName}:${clientRequestId}`;
}

export function createIdempotencyService(db: Database) {
  return {
    async findResult(userId: string, toolName: string, clientRequestId: string) {
      const rows = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.userId, userId),
            eq(idempotencyKeys.toolName, toolName),
            eq(idempotencyKeys.clientRequestId, clientRequestId)
          )
        )
        .limit(1);

      return rows[0]?.resultJson ?? null;
    },

    async storeResult(input: {
      userId: string;
      toolName: string;
      clientRequestId: string;
      resultJson: unknown;
      expiresAt: Date;
    }) {
      await db.insert(idempotencyKeys).values(input).onConflictDoNothing();
    },
  };
}
